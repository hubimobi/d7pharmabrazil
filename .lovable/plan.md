

## Problema identificado

A vitrine **não exibe produtos para visitantes anônimos** (que é a maioria dos clientes da loja). Os 5 produtos existem e estão ativos, mas a tabela `products` só tem políticas RLS para usuários **logados**:

| Tabela | Policy para anônimos? | Resultado |
|---|---|---|
| `products` | ❌ Não existe | Anônimo vê 0 produtos |
| `product_combos` | ✅ `active = true` | Anônimo vê combos |

A `current_tenant_id()` retorna NULL para visitantes não logados, então `tenant_id = current_tenant_id()` nunca casa. Resultado: a Home, `FeaturedCarousel`, `AllProducts`, `ProductsPage` e `ProductDetail` voltam arrays vazios.

Também há um problema de segurança apontado pelo scanner: a view `products_public` (que esconde `cost_price`) existe e é a forma correta de exposição pública, mas o frontend ignora ela e consulta `products` diretamente — perdendo proteção de margem **e** quebrando o acesso público.

## Solução

### 1. Adicionar policy pública de leitura na tabela `products` (migration)

```sql
-- Permite que qualquer visitante (anon + authenticated) leia produtos ativos
-- Filtro de tenant fica a cargo do frontend (passa tenant_id do hostname)
CREATE POLICY "products_public_select"
ON public.products
FOR SELECT
TO anon, authenticated
USING (active = true);
```

Isso é seguro porque:
- A tabela já é exposta via vitrine pública (qualquer um vê produtos no site)
- O filtro por `tenant_id` continua sendo feito no frontend com o tenant resolvido pelo hostname
- A view `products_public` continua escondendo `cost_price` nas consultas que a usam

### 2. Migrar consultas públicas para `products_public`

Trocar `from("products")` por `from("products_public")` em:
- `src/hooks/useProducts.tsx` (`useProducts` + `useProduct`)
- `src/components/checkout/CartRecommendations.tsx` (já usa o hook, ok)
- Manter `from("products")` apenas em telas admin (`src/pages/admin/ProductsPage.tsx`)

Isso resolve simultaneamente:
- A vitrine volta a funcionar para anônimos
- `cost_price` deixa de vazar em qualquer consulta pública (aborda finding de segurança secundária)

### 3. Garantir filtro consistente por `tenantId` resolvido

Revisar que todos os hooks de catálogo (`useProducts`, `useProduct`, `useCombos`) só rodam **depois** de `isResolved` no `TenantProvider`. Já está OK porque `TenantProvider` retorna `null` até resolver, mas vou confirmar e se necessário adicionar `enabled: !!tenantId` nas queries para evitar requests com tenant errado durante o boot.

### 4. Corrigir o finding de segurança paralelo (whatsapp_instances)

Já que o usuário está na tela de Security, aproveitar para corrigir o erro relacionado:
- A policy `whatsapp_instances_admin_select` permite que admin de tenant A leia chaves de API do tenant B
- Substituir por `(tenant_id = current_tenant_id()) OR is_super_admin()`

## Arquivos alterados

**Migration nova:**
- `supabase/migrations/<ts>_fix_products_public_access.sql`
  - `CREATE POLICY products_public_select` em `products`
  - `DROP POLICY whatsapp_instances_admin_select` + recria com escopo de tenant
  - `GRANT SELECT ON products_public TO anon, authenticated`

**Frontend:**
- `src/hooks/useProducts.tsx` → consultar `products_public`
- (verificar se `ProductDetail` e outros lugares precisam ajustar tipos)

## Resultado esperado

- Home volta a mostrar produtos em destaque, "Todos os Produtos" e carrossel para qualquer visitante
- `/produtos` e `/produto/:slug` voltam a funcionar para anônimos
- `cost_price` deixa de ser exposto na vitrine pública
- Finding de WhatsApp instances (vazamento entre tenants) corrigido
- Combos continuam funcionando como já funcionavam

## Riscos

- Baixo. Mudança de SELECT de tabela para view com mesmas colunas (menos `cost_price`). Se algum componente usar `cost_price` na vitrine (não deveria), precisa ajustar — vou confirmar antes de migrar.

