

## Log de Atividades Vazio - Diagnóstico e Correção

### Problema
A tabela `integration_logs` está completamente vazia (0 registros). Apenas 2 das 6 edge functions inserem logs (bling-refresh-token e bling-sync-order). As demais (check-payment-status, create-payment, asaas-webhook, ghl-sync) não registram nenhuma atividade.

### Correção

#### 1. Adicionar logs no `asaas-webhook`
Registrar quando um webhook é recebido, quando o pagamento é confirmado, e quando há erros.

#### 2. Adicionar logs no `check-payment-status`
Registrar quando o polling detecta um pagamento confirmado ou quando falha.

#### 3. Adicionar logs no `create-payment`
Registrar quando um pagamento é criado com sucesso (Pix gerado ou cartão aprovado) e erros.

#### 4. Adicionar logs no `ghl-sync`
Registrar quando um contato é criado/atualizado, quando tags são adicionadas, e quando oportunidades são criadas.

#### 5. Inserir log inicial de teste
Executar uma migração para inserir um registro de teste na tabela, confirmando que a exibição funciona.

### Padrão de log
Cada insert segue o mesmo formato já usado no Bling:
```typescript
await supabase.from("integration_logs").insert({
  integration: "asaas",  // ou "ghl"
  action: "payment_created",
  status: "success",     // ou "error"
  details: "Pix gerado para pedido #abc123"
});
```

### Arquivos modificados
- `supabase/functions/asaas-webhook/index.ts`
- `supabase/functions/check-payment-status/index.ts`
- `supabase/functions/create-payment/index.ts`
- `supabase/functions/ghl-sync/index.ts`

