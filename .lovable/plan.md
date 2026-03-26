

## Webhook Asaas para Confirmação Instantânea de Pagamento

### Problema Atual
O sistema usa polling (a cada 5s por até 15 min) para verificar o status do pagamento PIX. Isso é lento, consome recursos e pode falhar se o cliente fechar a página.

### Solução
Criar um webhook que o Asaas chama automaticamente quando o pagamento é confirmado, atualizando o pedido instantaneamente. Manter o polling como fallback.

### Implementação

#### 1. Adicionar coluna `asaas_payment_id` na tabela `orders`
Migração SQL para adicionar a coluna que vincula o pedido ao pagamento Asaas, permitindo o webhook encontrar o pedido correto.

#### 2. Salvar `asaas_payment_id` no pedido (edge function `create-payment`)
Após criar o pagamento no Asaas, salvar o `paymentData.id` na coluna `asaas_payment_id` do pedido.

#### 3. Criar edge function `asaas-webhook`
- Recebe POST do Asaas com evento de pagamento (`PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`)
- Valida o payload
- Busca o pedido pelo `asaas_payment_id`
- Atualiza status para `paid`
- Endpoint público (sem JWT) pois é chamado pelo Asaas

#### 4. Habilitar Realtime na tabela `orders`
Para que o frontend receba a atualização instantaneamente via WebSocket.

#### 5. Atualizar `PixPaymentResult` para usar Realtime
- Escutar mudanças na tabela `orders` filtradas pelo `order_id`
- Quando `status` mudar para `paid`, mostrar tela de confirmação
- Manter polling como fallback (intervalo maior, 15s)

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar — `asaas_payment_id` + realtime |
| `supabase/functions/asaas-webhook/index.ts` | Criar |
| `supabase/functions/create-payment/index.ts` | Editar — salvar `asaas_payment_id` |
| `src/components/checkout/PixPaymentResult.tsx` | Editar — adicionar listener Realtime |

### Configuração necessária
Após implementação, o usuário precisará configurar a URL do webhook no painel do Asaas:
`https://xufiemrhlmirkrdrcxox.supabase.co/functions/v1/asaas-webhook`

