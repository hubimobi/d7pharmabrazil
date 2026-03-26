-- Tighten abandoned_carts: require at least a customer_name
DROP POLICY IF EXISTS "Anyone can insert abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Anyone can insert abandoned carts" ON public.abandoned_carts
  FOR INSERT TO anon, authenticated
  WITH CHECK (customer_name IS NOT NULL AND customer_name != '');

-- Tighten popup_leads: require a valid email
DROP POLICY IF EXISTS "Anyone can insert popup leads" ON public.popup_leads;
CREATE POLICY "Anyone can insert popup leads" ON public.popup_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email != '' AND email LIKE '%@%.%');