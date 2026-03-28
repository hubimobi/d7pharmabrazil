
DROP POLICY "Anyone can view customer tags" ON public.customer_tags;

CREATE POLICY "Admins can view customer tags"
  ON public.customer_tags FOR SELECT
  TO authenticated
  USING (is_admin());
