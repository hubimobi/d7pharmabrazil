

## Problemas e Correções

### Problema 1: Bling recebe valor errado (R$250 em vez de R$23)
O `bling-sync-order` envia os itens com o `item.price` original do produto (preço cheio), ignorando que o `order.total` já reflete o desconto do cupom. O Bling soma os itens e calcula R$250.

**Correção**: Ao montar `blingItems`, calcular o desconto proporcional nos itens para que a soma dos valores bata com `order.total`. Adicionar campo de desconto no payload do Bling ou ajustar o preço unitário dos itens proporcionalmente.

### Problema 2: Bling sincroniza pedidos pendentes
O `handleSyncAll` filtra corretamente (`paid`, `shipped`, `delivered`), mas o sync individual e os triggers automáticos podem enviar pedidos `pending`. O botão de sync individual não valida o status.

**Correção**: No `bling-sync-order`, rejeitar pedidos com status `pending` ou `cancelled` (a menos que `force=true`). Também validar no botão individual do admin.

### Problema 3: Pedido 638 com cliente errado (Luciano Leal em vez de Marcio T Garcia)
Isso indica que o `orderRef` (primeiros 8 chars do UUID) está colidindo com outro pedido no Bling, ou o pedido errado está sendo sincronizado. A busca `pesquisa=` no Bling pode retornar resultados parciais. Precisamos verificar se os dados do pedido no banco estão corretos.

**Correção**: Melhorar a busca no Bling usando referência mais específica nas observações. Incluir validação de que o nome do cliente bate ao verificar duplicatas.

### Problema 4: Mostrar cupom na tabela de Vendas
O campo `coupon_code` já existe na tabela `orders`. Basta exibi-lo.

---

### Alterações

#### 1. `supabase/functions/bling-sync-order/index.ts`
- Rejeitar pedidos com status `pending` ou `cancelled` (exceto se `force=true`)
- Calcular desconto proporcional: comparar soma dos itens vs `order.total`, aplicar a diferença como desconto no payload do Bling (campo `desconto.valor`) para que o total no Bling reflita o valor real pago
- Melhorar verificação de duplicatas para validar que o cliente bate

#### 2. `src/pages/admin/OrdersPage.tsx`
- Adicionar coluna **"Cupom"** na tabela entre Total e Status
- Mostrar `order.coupon_code` como Badge quando presente
- No detalhe do pedido, mostrar o cupom usado
- No botão de sync individual, avisar se o pedido não está pago

