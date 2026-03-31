

# Revisão: Vínculos, URLs Personalizados e Fluxo de Compra

## Problemas Encontrados

### 1. Cupom da URL NÃO é repassado no redirect do ProductDetail
Quando um prescritor gera um link como `/produto/slug?cupom=STR2`, se o cliente clica em "Compra Rápida" ou o link tem `?ck=1`, o redirect para `/checkout` **perde o parâmetro `cupom`**.

**Arquivo**: `src/pages/ProductDetail.tsx` (linhas 43-51)
```
navigate(`/checkout?ck=${ckParam}${mParam}`, { replace: true });
// NÃO inclui ?cupom=XXX
```
**Correção**: Preservar o parâmetro `cupom` no redirect:
```
const cupom = searchParams.get("cupom") || searchParams.get("Cupom") || searchParams.get("CUPOM");
const cupomParam = cupom ? `&cupom=${cupom}` : "";
navigate(`/checkout?ck=${ckParam}${mParam}${cupomParam}`, { replace: true });
```

### 2. ComboDetail não lê `?cupom=` da URL
A página `/combo/slug?cupom=STR2` não tem nenhuma lógica para ler o parâmetro `cupom` e repassá-lo ao checkout.

**Arquivo**: `src/pages/ComboDetail.tsx` (linhas 129-136)
- `handleQuickBuy` navega para `/checkout` sem o cupom
**Correção**: Ler `searchParams`, preservar `cupom` no `navigate("/checkout?cupom=...")`.

### 3. CheckoutPageV3 NÃO vincula `doctor_id` ao pedido
O V3 envia `doctor_id: null` sempre (linha 165), diferente de V1 e V2 que usam `selectedDoctorId`. Isso significa que compras pelo checkout V3 **nunca geram comissões** para prescritores.

**Arquivo**: `src/pages/CheckoutPageV3.tsx` (linha 165)
```
doctor_id: null,  // BUG: sempre null
```
**Correção**: O V3 não tem seleção de prescritor, mas devemos ao menos vincular automaticamente via `getActiveRef()` se houver um doctor_id no localStorage do link.

### 4. Comissões NUNCA são criadas automaticamente
O `create-payment` salva o pedido com `doctor_id`, mas **nenhum lugar** gera a comissão na tabela `commissions`. O webhook `asaas-webhook` também não cria comissões quando o pagamento é confirmado. As comissões parecem ser criadas manualmente ou por um processo inexistente.

**Arquivo**: `supabase/functions/asaas-webhook/index.ts`
**Correção**: Quando o pagamento é confirmado (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`) e o pedido tem `doctor_id`, buscar o prescritor → representante → taxa de comissão e inserir na tabela `commissions`.

### 5. Link attribution no V3 não envia GA4 event
O `CheckoutPageV3` faz link attribution mas não dispara o evento GA4 `purchase_attributed`, diferente do V1.

---

## Plano de Implementação

### Passo 1: Preservar `cupom` nos redirects de produto/combo
- **ProductDetail.tsx**: No redirect `?ck=`, incluir `&cupom=` se presente
- **ComboDetail.tsx**: Ler `useSearchParams`, repassar `cupom` no `handleQuickBuy`

### Passo 2: Vincular doctor_id no CheckoutPageV3
- Adicionar `getActiveRef()` no V3 para preencher `doctor_id` automaticamente quando há referência de prescritor no localStorage (vindo de um link compartilhado)

### Passo 3: Gerar comissões automaticamente no webhook
- No `asaas-webhook/index.ts`, quando pagamento é confirmado e o pedido tem `doctor_id`:
  1. Buscar doctor → `representative_id`
  2. Buscar coupon do doctor → `commission_rate` (default 20%)
  3. Inserir registro em `commissions` com status `pending`

### Passo 4: Adicionar GA4 event no V3
- No bloco de link attribution do V3, disparar `gtag("event", "purchase_attributed", ...)` igual ao V1

### Resumo técnico

| Arquivo | Mudança |
|---|---|
| `src/pages/ProductDetail.tsx` | Preservar `?cupom=` no redirect |
| `src/pages/ComboDetail.tsx` | Ler e repassar `?cupom=` |
| `src/pages/CheckoutPageV3.tsx` | Auto-fill `doctor_id` via `getActiveRef()` + GA4 |
| `supabase/functions/asaas-webhook/index.ts` | Criar comissão automática ao confirmar pagamento |

