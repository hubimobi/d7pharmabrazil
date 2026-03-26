
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_cpf text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code text;

CREATE POLICY "Customers can view own orders by email"
ON public.orders
FOR SELECT
TO anon
USING (customer_email IS NOT NULL);
