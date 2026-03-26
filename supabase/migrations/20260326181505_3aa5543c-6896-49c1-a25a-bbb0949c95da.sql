
DROP POLICY "Customers can view own orders by email" ON public.orders;

CREATE POLICY "Anon denied direct orders access"
  ON public.orders
  FOR SELECT
  TO anon
  USING (false);
