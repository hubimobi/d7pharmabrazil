

## Revisão Completa do Checkout e Integrações - Problemas Encontrados e Correções

### Problemas Identificados

#### 1. **Asaas: URLs inconsistentes entre edge functions**
- `create-payment` usa `https://www.asaas.com/api/v3` (URL de produção correta)
- `check-payment-status` usa `https://api.asaas.com/v3` (URL diferente)
- Ambas deveriam usar a mesma base URL para consistência

#### 2. **Asaas: Valor mínimo de R$5,00 não validado**
- Os logs mostram erro: *"O valor da cobrança (R$ 2,38) não pode ser menor que R$ 5,00"*
- O checkout não valida valor mínimo antes de enviar ao Asaas
- **Correção**: Adicionar validação no frontend (valor mínimo R$5) e na edge function

#### 3. **Bling: Campo `product_id` mapeado incorretamente nos items**
- `bling-sync-order` busca items por `item.id`, mas o checkout salva items com campo `product_id`
- `const productIds = items.map((i: any) => i.id)` → deveria ser `i.product_id`
- Resultado: produtos nunca são encontrados no Bling, SKU/NCM ficam vazios

#### 4. **Bling: Sincronização automática não existe**
- Quando um pedido é pago (via webhook Asaas), **não há trigger automático** para sincronizar com o Bling
- O webhook `asaas-webhook` apenas atualiza status para "paid" mas não chama `bling-sync-order`
- **Correção**: Adicionar chamada ao `bling-sync-order` dentro do webhook quando pagamento é confirmado

#### 5. **Checkout: Cart não persiste entre páginas**
- O carrinho usa `useState` sem persistência (localStorage). Se o usuário recarregar a página, perde tudo
- **Correção**: Persistir items no localStorage

#### 6. **Checkout: Desconto do combo não é aplicado no valor do pagamento**
- O ComboUpsell adiciona produtos ao carrinho pelo preço cheio
- O desconto visual (17% OFF) é mostrado mas **não é refletido no total real**
- Os produtos entram pelo `price` normal, sem desconto aplicado

#### 7. **Checkout: `coupon.used_count` incrementado antes do pagamento**
- O cupom é marcado como usado quando aplicado, não quando o pagamento é confirmado
- Se o usuário desistir, o cupom já foi "gasto"

#### 8. **Checkout: Frete grátis do combo não aplicado**
- Quando o combo tem `combo_offer_free_shipping: true` e o usuário aceita, o frete grátis não é propagado ao cálculo final

#### 9. **Realtime: Tabela orders não está na publicação realtime**
- O `PixPaymentResult` escuta mudanças realtime na tabela `orders`, mas provavelmente a tabela não está no `supabase_realtime` publication
- **Correção**: Adicionar migration `ALTER PUBLICATION supabase_realtime ADD TABLE public.orders`

#### 10. **Segurança: Dados do cartão trafegam pela edge function**
- Os dados completos do cartão (número, CVV) passam pelo servidor. Isso funciona com Asaas mas é sensível

---

### Plano de Correções

| # | Arquivo | Correção |
|---|---------|----------|
| 1 | `supabase/functions/check-payment-status/index.ts` | Corrigir URL base para `https://www.asaas.com/api/v3` |
| 2 | `src/pages/CheckoutPage.tsx` | Validar valor mínimo R$5 antes de submeter pagamento |
| 3 | `supabase/functions/bling-sync-order/index.ts` | Corrigir mapeamento `item.id` → `item.product_id` |
| 4 | `supabase/functions/asaas-webhook/index.ts` | Após atualizar pedido para "paid", chamar `bling-sync-order` automaticamente |
| 5 | `src/hooks/useCart.tsx` | Persistir carrinho no localStorage |
| 6 | `src/components/checkout/ComboUpsell.tsx` | Aplicar desconto real nos produtos do combo (ajustar preço no cart) |
| 7 | `src/hooks/useCart.tsx` | Mover incremento do `used_count` para após confirmação de pagamento |
| 8 | `src/pages/CheckoutPage.tsx` + `ComboUpsell` | Propagar flag de frete grátis do combo para o cálculo de shipping |
| 9 | Migration SQL | `ALTER PUBLICATION supabase_realtime ADD TABLE public.orders` |

### Detalhes Técnicos

**Correção #4 - Auto-sync Bling no webhook:**
```text
asaas-webhook recebe PAYMENT_CONFIRMED
  → atualiza orders.status = "paid"
  → se atualizou com sucesso, chama bling-sync-order com order_id
```

**Correção #5 - Persistência do carrinho:**
- Inicializar items do localStorage
- Salvar no localStorage a cada mudança via useEffect

**Correção #6 - Desconto do combo:**
- Quando o combo é aceito, calcular o preço com desconto e adicionar os produtos com preço ajustado, ou aplicar o desconto como um "cupom interno" do combo

