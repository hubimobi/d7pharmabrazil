
-- Remove public SELECT from base tables (only admins should query them directly)
DROP POLICY "Public can view safe coupon fields via view" ON public.coupons;
DROP POLICY "Public can view safe agent fields via view" ON public.ai_agents;

-- Recreate views as SECURITY DEFINER (needed since base tables no longer allow public SELECT)
-- These views are safe because they only expose non-sensitive columns
DROP VIEW IF EXISTS public.coupons_public;
CREATE VIEW public.coupons_public 
WITH (security_barrier = true) AS
SELECT 
  id, code, description, discount_type, discount_value, 
  free_shipping, min_order_value, max_uses, used_count,
  active, starts_at, expires_at, product_id, created_at
FROM public.coupons
WHERE active = true;

DROP VIEW IF EXISTS public.ai_agents_public;
CREATE VIEW public.ai_agents_public
WITH (security_barrier = true) AS
SELECT id, name, slug, description, icon, color, active
FROM public.ai_agents
WHERE active = true;

GRANT SELECT ON public.coupons_public TO anon, authenticated;
GRANT SELECT ON public.ai_agents_public TO anon, authenticated;
