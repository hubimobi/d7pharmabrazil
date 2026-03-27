

## Plano: Corrigir Integração Asaas Webhook + Robustez do Sistema

### Problema Raiz
O webhook do Asaas está sendo **bloqueado pela verificação JWT**. Edge functions do Lovable Cloud exigem JWT por padrão, mas o Asaas envia webhooks sem autenticação JWT. Resultado: todas as notificações de pagamento são rejeitadas com 401.

### Correção 1 — Desabilitar JWT no webhook (CRÍTICO)

Adicionar configuração no `supabase/config.toml`:

```toml
[functions.asaas-webhook]
verify_jwt = false
```

Isso permite que o Asaas envie webhooks sem token JWT.

### Correção 2 — Corrigir pedido pendente manualmente

Atualizar o pedido `48806e93-870f-4f23-821c-bb3f2e45a866` para "paid" via migration e disparar sync com Bling.

### Correção 3 — Botão "Marcar como Pago" no Admin

No `OrdersPage.tsx`, adicionar ação no menu de cada pedido pendente:
- "Marcar como Pago" — atualiza status para "paid" e dispara sync com Bling automaticamente
- Útil para casos onde o webhook falha

### Correção 4 — Robustez do Webhook

No `asaas-webhook/index.ts`:
- Adicionar validação opcional por token secreto (header `asaas-access-token`) para segurança
- Tratar mais eventos: `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED` para manter status atualizado
- Logar o body completo em caso de erro para debug

### Correção 5 — Polling mais resiliente

No `PixPaymentResult.tsx`:
- Fazer primeiro poll imediatamente (não esperar 15s)
- Reduzir intervalo para 10s
- Mostrar botão "Verificar pagamento" manual caso o polling falhe

### Arquivos modificados

| Arquivo | Ação |
|---|---|
| `supabase/config.toml` | Adicionar `verify_jwt = false` para `asaas-webhook` |
| `supabase/functions/asaas-webhook/index.ts` | Tratar mais eventos + log melhorado |
| `src/pages/admin/OrdersPage.tsx` | Botão "Marcar como Pago" + sync Bling |
| `src/components/checkout/PixPaymentResult.tsx` | Poll imediato + botão manual |
| Migration SQL | Corrigir pedido 48806e93 |

### URL do Webhook para configurar no Asaas

O webhook precisa estar configurado no painel do Asaas apontando para:
`https://xufiemrhlmirkrdrcxox.supabase.co/functions/v1/asaas-webhook`

Eventos a habilitar: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`

