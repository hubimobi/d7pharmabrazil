

## Pedido Pago Não Sincroniza com Bling - Diagnóstico e Correção

### Problema Raiz

Existem **3 caminhos** onde um pagamento pode ser confirmado, mas apenas 1 deles (webhook) tenta sincronizar com o Bling — e o webhook **não está recebendo chamadas** (zero logs):

```text
Caminho 1: Webhook Asaas → atualiza order → chama bling-sync ✅ (mas webhook não chega)
Caminho 2: Polling (check-payment-status) → atualiza order → NÃO chama bling ❌
Caminho 3: Cartão aprovado na hora (create-payment) → salva como "paid" → NÃO chama bling ❌
```

O pagamento Pix do screenshot foi confirmado pelo **polling** (check-payment-status), que atualizou o pedido para "paid" mas nunca chamou o `bling-sync-order`.

### Correções

#### 1. Adicionar sync com Bling no `check-payment-status`
Quando o polling detecta pagamento confirmado e atualiza o pedido, também chamar `bling-sync-order` — mesmo padrão do webhook.

#### 2. Adicionar sync com Bling no `create-payment`
Quando cartão de crédito é aprovado instantaneamente (status CONFIRMED), chamar `bling-sync-order` logo após salvar o pedido.

#### 3. Adicionar botão manual "Sincronizar com Bling" no admin
Na página de integrações ou em uma futura página de pedidos, permitir reenvio manual para casos de falha. Por ora, adicionar na página de integrações um campo para inserir o ID do pedido e forçar a sincronização.

#### 4. Verificar configuração do webhook no Asaas
Informar ao usuário que o webhook do Asaas precisa estar configurado apontando para:
`https://xufiemrhlmirkrdrcxox.supabase.co/functions/v1/asaas-webhook`

### Arquivos Modificados
- `supabase/functions/check-payment-status/index.ts` — adicionar chamada ao bling-sync-order após confirmar pagamento
- `supabase/functions/create-payment/index.ts` — adicionar chamada ao bling-sync-order quando cartão aprovado na hora
- `src/pages/admin/IntegrationsPage.tsx` — adicionar botão de sync manual com Bling

