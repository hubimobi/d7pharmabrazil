
-- Drop the overly permissive policy and replace with a more specific one
DROP POLICY "Anyone can create orders" ON public.orders;

-- Allow anonymous/authenticated users to insert orders but restrict columns
CREATE POLICY "Customers can create orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    customer_name IS NOT NULL AND total > 0
  );
