

## Revisão da Integração Bling — Status Atual

### O que está funcionando corretamente

1. **OAuth e Tokens** (`bling-callback`, `bling-refresh-token`, `getValidToken`)
   - Fluxo OAuth completo com troca de código por token
   - Renovação automática proativa (24h antes de expirar)
   - Renovação inline no `getValidToken` quando token expira entre ciclos
   - Notificação admin em caso de falha na renovação

2. **Sincronização de Pedidos** (`bling-sync-order`)
   - Bloqueio de pedidos `pending`/`cancelled` (exceto com `force=true`)
   - Verificação de duplicatas com validação de nome do cliente
   - Busca de produtos no Bling por SKU para evitar erro "código já existe"
   - Cálculo de desconto proporcional (cupom) via campo `desconto.valor`
   - Tratamento de erro code 3 (pedido idêntico) com recuperação automática
   - Log detalhado em `integration_logs`

3. **Gatilhos automáticos** — Bling sync é chamado de 3 fontes:
   - `create-payment`: quando cartão é aprovado instantaneamente
   - `asaas-webhook`: quando Pix/boleto é confirmado
   - `check-payment-status`: polling de status

4. **Admin UI** — Sync individual com `refetch()`, sync em lote filtra por status válido

### Problemas Encontrados

| # | Problema | Severidade | Descrição |
|---|---------|-----------|-----------|
| 1 | **Sem `codigo` quando SKU é vazio** | Baixa | Se o produto não tem SKU no banco, o item vai ao Bling sem `codigo` nem `produto.id`. O Bling pode rejeitar ou criar item sem código. Deveria usar o slug ou nome como fallback. |
| 2 | **`numero: 0` fixo** | Info | Funciona — o Bling auto-atribui — mas impede buscar pela numeração depois. Ideal seria usar um sequencial. |
| 3 | **Sem retry em falhas de rede** | Baixa | Se o Bling está fora do ar momentaneamente, o sync falha sem retry. Os gatilhos automáticos (webhook/polling) não reprocessam. |
| 4 | **`handleSyncAll` sem delay** | Média | Dispara todos os pedidos em sequência rápida, podendo causar rate-limiting na API do Bling. Deveria ter delay entre requests. |
| 5 | **Cron job não configurado** | Alta | O `bling-refresh-token` existe mas não há cron job configurado no `config.toml`. O token pode expirar se ninguém chamar manualmente. |

### Correções Recomendadas

1. **Configurar Cron Job** no `supabase/config.toml` para chamar `bling-refresh-token` a cada 12h
2. **Adicionar delay no `handleSyncAll`** (500ms entre cada pedido) para evitar rate-limit
3. **Fallback de código do item** — usar slug do produto quando SKU está vazio
4. **Tratamento de rate-limit** — detectar HTTP 429 e aguardar antes de retry

### Alterações Técnicas

#### 1. `supabase/config.toml`
- Adicionar bloco `[functions.bling-refresh-token]` com schedule cron a cada 12h

#### 2. `supabase/functions/bling-sync-order/index.ts`
- Adicionar fallback: quando SKU vazio, não enviar `codigo` (já funciona assim, item fica sem código — aceitável)
- Nenhuma mudança crítica necessária

#### 3. `src/pages/admin/OrdersPage.tsx`
- Adicionar `await new Promise(r => setTimeout(r, 500))` entre cada sync no `handleSyncAll`

### Veredicto

A integração está **~90% funcional**. O único risco real é o **cron job ausente** para renovação automática do token — sem ele, o token pode expirar e todos os syncs falharem até reconexão manual. As demais correções são melhorias de robustez.

