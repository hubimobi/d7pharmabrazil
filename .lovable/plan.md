

# Fix: Números WhatsApp sem código de país (55)

## Problema
A Evolution API rejeita o número `47984826726` com `{"exists": false}` porque o envia como `47984826726@s.whatsapp.net`. O formato correto para a API é `5547984826726@s.whatsapp.net` — com o código do Brasil (`55`) no início.

O código atual só faz `phone.replace(/\D/g, "")` (remove caracteres não-numéricos), mas nunca adiciona o `55`.

## Solução
Criar uma função `ensureBrazilCountryCode(phone)` que:
1. Remove caracteres não-numéricos
2. Se o número tem 10 ou 11 dígitos (formato brasileiro DDD + número), adiciona `55` no início
3. Se já começa com `55` e tem 12-13 dígitos, mantém como está

Aplicar essa função em **3 arquivos**:

### Arquivos modificados

1. **`supabase/functions/whatsapp-process-queue/index.ts`**
   - Substituir `msg.contact_phone.replace(/\D/g, "")` pela nova função (2 ocorrências: `send_file` e texto padrão)

2. **`supabase/functions/whatsapp-send/index.ts`**
   - Substituir `phone.replace(/\D/g, "")` pela nova função

3. **`supabase/functions/whatsapp-webhook/index.ts`**
   - Verificar se números inseridos na fila já estão formatados corretamente

### Lógica da função

```typescript
function ensureBrazilCountryCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // 10-11 digits = Brazilian national format (DDD + number)
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return digits;
}
```

### Correção retroativa
- Executar migration para corrigir as mensagens pendentes do Luciano Leal, atualizando `contact_phone` de `47984826726` para `5547984826726` e resetando `retry_count` e `error_message`

