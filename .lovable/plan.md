

# Auditoria de Segurança Completa - Plano de Correção

## Vulnerabilidades Encontradas

A análise identificou **10 problemas de segurança**, sendo 4 críticos, 4 de risco médio e 2 de risco baixo.

---

## CRÍTICOS (Exploráveis imediatamente)

### 1. Qualquer pessoa pode alterar dados de leads (popup_leads)
A política `"Anyone can update popup leads by email"` usa `USING (true) WITH CHECK (true)`, permitindo que qualquer visitante anônimo modifique qualquer registro de lead -- incluindo e-mail, telefone e status de sincronização de terceiros.

**Correção:** Remover essa política. Se o upsert for necessário, usar uma função `SECURITY DEFINER` chamada pelo backend.

### 2. Prescritores podem se auto-aprovar
A política de INSERT na tabela `doctors` permite inserção com `approval_status = 'approved'` se `representative_id IS NOT NULL`. Um atacante pode adivinhar/enumerar UUIDs de representantes e se registrar como prescritor aprovado instantaneamente.

**Correção:** Forçar `approval_status = 'pending'` em todos os inserts anônimos, independentemente do `representative_id`.

### 3. Preço de custo exposto publicamente
A tabela `products` tem leitura pública e inclui a coluna `cost_price`. Qualquer visitante pode consultar o custo real dos produtos via API.

**Correção:** Criar uma view segura `products_public` que exclui `cost_price` e redirecionar a política de SELECT pública para essa view, ou bloquear a coluna com uma política mais restritiva.

### 4. Dados confidenciais do negócio expostos via store_settings
A política `"Anyone can view store settings"` expõe `goal_monthly_revenue`, `goal_profit_margin`, `cnpj`, `meta_pixel_id`, `gtm_id`, `hotjar_id` e `webchat_script` para qualquer visitante.

**Correção:** A view `store_settings_public` já existe. Verificar se o frontend público usa exclusivamente essa view e remover a política de SELECT pública da tabela `store_settings` (mantendo apenas para admin autenticado).

---

## RISCO MEDIO

### 5. Upload de arquivos sem restrição de path
A política `"Auth upload images"` permite que qualquer usuário autenticado (inclusive prescritores/representantes de baixo privilégio) faça upload de qualquer arquivo no bucket `images` sem restrição de pasta.

**Correção:** Restringir uploads ao role admin ou escopar por `auth.uid()`.

### 6. Injeção de script via webchat_script
O `WebchatWidget.tsx` executa `settings.webchat_script` diretamente no DOM sem sanitização. Embora só admins configurem esse campo, se a conta admin for comprometida, o atacante pode injetar scripts maliciosos que rodam para todos os visitantes.

**Correção:** Validar que o conteúdo é de domínios confiáveis (whitelist de origens de script) ou alertar sobre o risco no admin.

### 7. Injeção via IDs de pixel (Meta/GTM/Hotjar)
O `TrackingScripts.tsx` interpola `metaPixelId`, `gtmId` e `hotjarId` diretamente em strings de JavaScript sem sanitizar. Se um admin malicioso inserir código JS nesses campos, ele será executado no navegador de todos os visitantes.

**Correção:** Validar que esses IDs contêm apenas caracteres alfanuméricos antes de interpolar.

### 8. Proteção contra senhas vazadas desativada
A verificação HIBP (Have I Been Pwned) está desativada, permitindo que usuários admin usem senhas já comprometidas em vazamentos públicos.

**Correção:** Ativar via Cloud -> Users -> Auth Settings -> Password HIBP Check.

---

## RISCO BAIXO

### 9. noscript do Meta Pixel dentro do head
O `TrackingScripts.tsx` insere um `<noscript><img>` dentro do `<head>`, o que viola a especificação HTML5 e pode causar comportamento inesperado em alguns navegadores.

**Correção:** Mover para `document.body`.

### 10. Políticas INSERT com `WITH CHECK (true)` em tabelas de tracking
Tabelas como `link_clicks`, `link_conversions`, `abandoned_carts` permitem INSERT anônimo sem restrição. Isso é intencional para tracking, mas pode ser abusado para poluir dados com inserts em massa.

**Correção:** Adicionar rate limiting via Edge Function ou pelo menos validar campos obrigatórios na política.

---

## Implementação (ordenada por prioridade)

### Migração SQL (itens 1-5)

```sql
-- 1. Remover política permissiva de popup_leads
DROP POLICY "Anyone can update popup leads by email" ON public.popup_leads;

-- 2. Corrigir auto-aprovação de prescritores
DROP POLICY "Anyone can self-register as doctor" ON public.doctors;
CREATE POLICY "Anyone can self-register as doctor" ON public.doctors
  FOR INSERT TO anon
  WITH CHECK (
    name IS NOT NULL AND name <> ''
    AND approval_status = 'pending'
  );

-- 3. Criar view segura para produtos (sem cost_price)
CREATE OR REPLACE VIEW public.products_public AS
  SELECT id, name, slug, description, price, promotional_price,
         image, images, active, featured, weight_grams,
         height_cm, width_cm, length_cm, sku, stock,
         category, manufacturer_id, group_id, created_at
  FROM public.products
  WHERE active = true;

-- Trocar política pública para a view
DROP POLICY "Anyone can view active products" ON public.products;
CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT TO authenticated USING (public.is_admin());
-- Nota: o frontend público passará a usar a view products_public

-- 4. Remover SELECT público de store_settings (usar view)
DROP POLICY "Anyone can view store settings" ON public.store_settings;
CREATE POLICY "Admins can view store settings" ON public.store_settings
  FOR SELECT TO authenticated USING (public.is_admin());

-- 5. Restringir upload de images a admins
DROP POLICY "Auth upload images" ON storage.objects;
CREATE POLICY "Admins can upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND public.is_admin());
```

### Código Frontend (itens 3, 4, 6, 7, 9)

- **useProducts/useStoreSettings**: Garantir que queries públicas usem `products_public` view e `store_settings_public` view
- **TrackingScripts.tsx**: Sanitizar IDs de pixel com regex `/^[a-zA-Z0-9-_]+$/`
- **TrackingScripts.tsx**: Mover noscript do Meta Pixel para `document.body`
- **WebchatWidget.tsx**: Adicionar validação básica de domínios de script

### Configuração (item 8)

- Ativar HIBP Check via ferramenta de configuração de auth

---

## Arquivos Envolvidos

| Arquivo | Mudança |
|---|---|
| Nova migração SQL | Políticas RLS, view `products_public` |
| `src/hooks/useProducts.tsx` | Usar view `products_public` para queries públicas |
| `src/hooks/useStoreSettings.tsx` | Confirmar uso de `store_settings_public` |
| `src/components/TrackingScripts.tsx` | Sanitizar IDs, mover noscript |
| `src/components/WebchatWidget.tsx` | Validação básica de scripts |

---

## Resumo de Impacto

- **4 vulnerabilidades críticas** que permitem vazamento de dados, manipulação de registros e escalação de privilégios
- **4 riscos médios** que podem ser explorados se uma conta admin for comprometida
- **2 riscos baixos** de conformidade e higiene

