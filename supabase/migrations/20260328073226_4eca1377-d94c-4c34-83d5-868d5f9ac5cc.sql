
-- Convert views to SECURITY INVOKER to satisfy linter
DROP VIEW IF EXISTS public.coupons_public;
CREATE VIEW public.coupons_public 
WITH (security_invoker = true) AS
SELECT 
  id, code, description, discount_type, discount_value, 
  free_shipping, min_order_value, max_uses, used_count,
  active, starts_at, expires_at, product_id, created_at
FROM public.coupons
WHERE active = true;

DROP VIEW IF EXISTS public.ai_agents_public;
CREATE VIEW public.ai_agents_public
WITH (security_invoker = true) AS
SELECT id, name, slug, description, icon, color, active
FROM public.ai_agents
WHERE active = true;

-- Re-add base table SELECT policies (needed for security_invoker views)
CREATE POLICY "Public can view active coupons"
ON public.coupons FOR SELECT TO anon, authenticated
USING (active = true);

CREATE POLICY "Public can view active agents"
ON public.ai_agents FOR SELECT TO anon, authenticated
USING (active = true);

GRANT SELECT ON public.coupons_public TO anon, authenticated;
GRANT SELECT ON public.ai_agents_public TO anon, authenticated;
