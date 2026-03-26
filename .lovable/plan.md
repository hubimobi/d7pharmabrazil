

## Plan: Order Confirmation Page + Customer Order Tracking Portal

### What we'll build

1. **Enhanced "Venda Confirmada" screen** — After payment is confirmed (both PIX and card), show a rich confirmation page with order details, delivery address info, and a message that the order is being prepared for shipping.

2. **Customer Order Tracking page** (`/meus-pedidos`) — A public page where customers can look up their order by email + order ID (no full auth needed), and see the current status and delivery info.

3. **Customer Login Portal** (`/acompanhar-pedido`) — Simple lookup form (email + order number) that queries the orders table and displays status timeline (Pendente → Pago → Preparando → Enviado → Entregue).

### Technical Details

#### Files to create:
| File | Purpose |
|------|---------|
| `src/pages/OrderConfirmationPage.tsx` | Rich confirmation screen with order summary, address, status |
| `src/pages/TrackOrderPage.tsx` | Customer lookup page — enter email + order code to see status |

#### Files to edit:
| File | Change |
|------|--------|
| `src/components/checkout/PixPaymentResult.tsx` | After confirmation, redirect to `/pedido-confirmado/:orderId` instead of showing inline success |
| `src/pages/CheckoutPage.tsx` | After card payment success, redirect to `/pedido-confirmado/:orderId`; pass address data to order |
| `src/App.tsx` | Add routes for `/pedido-confirmado/:orderId` and `/acompanhar-pedido` |
| `src/components/Header.tsx` | Add "Acompanhar Pedido" link |

#### Database migration:
Add `customer_cpf`, `shipping_address` (jsonb), and `tracking_code` columns to `orders` table so we can store delivery info and allow tracking.

#### Order Confirmation Page content:
- ✅ Green checkmark + "Venda Confirmada!"
- "Seu pedido está sendo preparado para envio"
- Order number, items summary, total paid
- Delivery address display
- "Acompanhar Pedido" button
- "Continuar Comprando" button

#### Track Order Page:
- Simple form: Email + últimos 8 dígitos do pedido
- No authentication required (lookup by email + order ID prefix)
- Shows order status timeline with visual steps
- RLS: add SELECT policy for anon users filtered by email match

