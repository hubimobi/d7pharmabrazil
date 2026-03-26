

## Problem

After paying via PIX, the checkout stays stuck on the QR Code screen forever. There is no mechanism to check if the payment was confirmed by Asaas -- the app just shows the QR code and waits indefinitely.

## Solution

Add automatic payment status polling that checks Asaas every few seconds and transitions to a success screen when the payment is confirmed.

### 1. Create edge function `check-payment-status`

A new backend function that receives a `payment_id`, queries Asaas API for the current status, and returns it. Also updates the order status in the database when confirmed.

### 2. Add polling to `PixPaymentResult` component

- Accept `payment_id` and `order_id` as new props
- Use `setInterval` (every 5 seconds) to call the new edge function
- When status is `CONFIRMED` or `RECEIVED`:
  - Show success screen with green checkmark and "Pagamento Confirmado!"
  - Clear the cart
  - Stop polling
- Show a subtle "Aguardando confirmação..." indicator while polling
- Auto-stop polling after 15 minutes (timeout)

### 3. Update `CheckoutPage` to pass payment data

Pass `payment_id` and `order_id` from `paymentResult` down to `PixPaymentResult`, and pass `clearCart` so the cart is cleared on confirmation.

### Files to create/edit

| File | Action |
|------|--------|
| `supabase/functions/check-payment-status/index.ts` | Create -- queries Asaas `GET /payments/{id}` and updates order |
| `src/components/checkout/PixPaymentResult.tsx` | Edit -- add polling logic and success state |
| `src/pages/CheckoutPage.tsx` | Edit -- pass `payment_id`, `order_id`, `onConfirmed` to PixPaymentResult |

