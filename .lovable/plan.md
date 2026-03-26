

## Fix: Orders Table Anon SELECT Policy Exposing All Orders

### Problem
The `orders` table policy `Customers can view own orders by email` uses `customer_email IS NOT NULL` for `anon` role, which is true for nearly all orders -- exposing PII (CPF, phone, address, payment IDs) to any unauthenticated user.

### Affected Features (anon access needed)
1. **TrackOrderPage** -- queries orders by email + order ID prefix (anon users)
2. **OrderConfirmationPage** -- queries order by exact ID (anon users, just placed order)
3. **RecentPurchasePopup** -- queries recent orders for social