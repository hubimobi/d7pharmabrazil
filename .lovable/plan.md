

## Pedido do Bling sem ID - Diagnóstico e Correção

### Causa Provável
O pedido do Marcio T Garcia foi sincronizado com Bling **antes** da migração que adicionou a coluna `bling_order_id`. O pedido existe no Bling mas o ID não foi salvo no banco.

### Solução

1. **Corrigir `handleSyncBling`** para dar `refetch()` após sincronizar — assim o ID aparece na tabela sem precisar recarregar a página manualmente.

2. **Ação imediata**: O botão de sync individual já busca no Bling e salva o ID (linha 159-160 do edge function). Basta clicar no ícone de sincronizar do pedido do Marcio — ele vai encontrar o pedido existente no Bling e salvar o ID.

3. **Corrigir `handleSyncAll`** para também dar `refetch()` ao final.

### Alteração técnica
- **`src/pages/admin/OrdersPage.tsx`**: Adicionar `refetch()` após `handleSyncBling` e `handleSyncAll` para atualizar a tabela com os IDs salvos.

