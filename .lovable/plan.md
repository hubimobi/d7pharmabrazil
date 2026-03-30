

# Revisão Completa: Erros, Segurança e Estrutura

## Resumo dos Problemas Encontrados

### 🔴 CRÍTICO — Falhas de Segurança

**1. Edge Functions sem autenticação (qualquer pessoa pode chamar)**
Estas funções usam `SERVICE_ROLE_KEY` (acesso total ao banco) mas NÃO verificam quem está chamando:

| Função | Risco |
|---|---|
| `generate-testimonials` | Qualquer pessoa gera conteúdo via IA (custo) |
| `generate-ad-copy` | Idem |
| `generate-image` | Idem |
| `remove-background` | Idem |
| `product-qa` | Idem |
| `ai-kb-crawl` | Idem |
| `pay-commissions` | **Qualquer pessoa pode disparar transferência PIX** |
| `bling-sync-order` | Qualquer pessoa pode sincronizar pedidos |
| `bling-export-product` | Qualquer pessoa pode exportar |
| `bling-list-products` | Qualquer pessoa pode listar |
| `ghl-sync` | Qualquer pessoa pode sincronizar CRM |
| `tiktok-shop-sync-products` | Sem auth |
| `tiktok-shop-sync-orders` | Sem auth |

**Correção**: Adicionar verificação de JWT/auth em todas as funções admin. Funções públicas (create-payment, track-order, recent-orders, calculate-shipping, sitemap-xml) podem continuar sem auth mas com rate-limiting lógico.

**2. `get-order` — Exposição de dados sem autenticação**
Qualquer pessoa que tenha um `order_id` (UUID) pode consultar nome, email, itens e endereço do cliente. Sem nenhuma verificação.

**Correção**: Exigir pelo menos um campo de verificação (email ou CPF) além do order_id.

**3. `create-prescriber-signup` — Criação de usuário sem auth**
Qualquer pessoa pode criar um usuário prescritor se souber o email de um doutor cadastrado. Não há rate-limiting nem captcha.

**Correção**: Adicionar rate-limiting ou mover para fluxo com verificação.

**4. `whatsapp-instance` usa `is_admin()` RPC com service_role**
A função cria o client com `SERVICE_ROLE_KEY` e depois chama `supabase.rpc("is_admin")` — mas `is_admin()` usa `auth.uid()`, que retorna NULL quando chamado com service_role. A verificação de admin pode estar falhando silenciosamente.

**Correção**: Usar `getUser(token)` + verificar roles diretamente (como `create-tenant-user` já faz).

**5. `dangerouslySetInnerHTML` sem sanitização**
Encontrado em: `ProductDetail.tsx`, `ComboDetail.tsx`, `StaticPage.tsx`. Conteúdo HTML do banco renderizado diretamente sem DOMPurify. Um admin comprometido pode injetar scripts (XSS stored).

**Correção**: Instalar `dompurify` e sanitizar todo HTML antes de renderizar.

---

### 🟡 ESTRUTURAL — Problemas de Código

**6. Uso massivo de `as any` (855 ocorrências)**
Quase todo acesso ao Supabase usa casting `as any`, indicando que os tipos gerados estão desatualizados ou incompletos. Isso elimina a segurança de tipos do TypeScript.

**Correção**: Após todas as migrações, regenerar os tipos. Enquanto isso, criar interfaces locais para os campos mais usados para reduzir os casts.

**7. Border style "square" não exclui admin corretamente**
O CSS usa `border-radius: revert !important` para admin, mas `revert` não funciona como esperado em todos os browsers para propriedades herdadas. Além disso, `data-admin-theme` é setado no `<html>` (mesma tag que `data-border-style`), então o seletor `[data-border-style="square"] [data-admin-theme]` nunca casa (não há ancestral→descendente).

**Correção**: Marcar o container admin com uma classe (e.g., `.admin-panel`) e usar `:not(.admin-panel *)` no override, ou aplicar o override apenas em rotas públicas.

**8. Section order no banco não inclui as novas seções**
O default de `section_order` no banco ainda é a lista antiga sem `section_highlight_banner` e `section_flash_sale`. Registros existentes terão a ordem errada.

**Correção**: Migration para atualizar o default e os registros existentes.

---

### 🟢 DUPLICAÇÕES a Unificar

**9. `get-order` vs `track-order`**
Ambas buscam pedidos por ID. `track-order` é mais completa (busca por email/CPF/código). `get-order` é usada apenas na página de confirmação.

> **Pergunta**: Unificar `get-order` dentro de `track-order` com um parâmetro `mode: "exact" | "search"`?

**10. `create-prescriber-user` vs `create-prescriber-signup`**
Ambas criam usuários prescritores. A diferença é que uma é chamada pelo admin e outra pelo próprio prescritor (self-signup).

> São fluxos distintos (admin vs self-service), manter separados é correto. Apenas adicionar auth na de admin e rate-limit na de self-service.

**11. Funções de LLM duplicadas em cada edge function**
`getActiveLLM()` e `getCustomPrompt()` são copiadas em: `generate-testimonials`, `generate-ad-copy`, `product-qa`. Código idêntico em 3+ lugares.

> **Pergunta**: Consolidar em um arquivo compartilhado? (Edge functions do Supabase não suportam imports entre functions facilmente, mas pode-se criar um shared helper inline ou aceitar a duplicação.)

---

## Plano de Implementação

### Fase 1 — Segurança (Prioridade Máxima)

1. **Adicionar auth check nas edge functions admin-only**: `generate-testimonials`, `generate-ad-copy`, `generate-image`, `remove-background`, `ai-kb-crawl`, `pay-commissions`, `bling-sync-order`, `bling-export-product`, `bling-list-products`, `ghl-sync`, `tiktok-shop-sync-*`
   - Padrão: extrair Bearer token → `getUser(token)` → verificar role via query em `user_roles`

2. **Proteger `get-order`**: exigir `order_id` + `customer_email` para confirmar identidade

3. **Corrigir `whatsapp-instance`**: trocar `rpc("is_admin")` por verificação direta de roles com o token do usuário

4. **Instalar DOMPurify** e sanitizar HTML em `ProductDetail`, `ComboDetail`, `StaticPage`

### Fase 2 — Estrutura

5. **Corrigir CSS de border square**: mudar estratégia para só aplicar nas rotas públicas (adicionar classe no container da loja, não no admin)

6. **Atualizar default de `section_order`** no banco para incluir highlight_banner e flash_sale

7. **Unificar `get-order` em `track-order`** (se aprovado)

### Fase 3 — Qualidade

8. **Reduzir `as any`** nos arquivos mais críticos (checkout, produtos, pedidos) criando type guards e interfaces auxiliares

---

## Detalhes Técnicos

### Auth check padrão para edge functions:
```typescript
// Extrair e validar usuário
const authHeader = req.headers.get("Authorization");
if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

// Verificar role admin
const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
const isAdmin = roles?.some(r => ["super_admin","admin","administrador","suporte","gestor"].includes(r.role));
if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
```

### CSS border fix:
```css
/* Aplicar apenas fora do admin */
[data-border-style="square"] main *,
[data-border-style="square"] footer *,
[data-border-style="square"] header *,
[data-border-style="square"] .storefront * {
  border-radius: 0 !important;
}
```

Total estimado: ~15 arquivos modificados, maioria edge functions com 5-10 linhas adicionadas cada.

