
-- 1. Create coupons_public view (excludes representative_id, doctor_id)
CREATE OR REPLACE VIEW public.coupons_public AS
SELECT 
  id, code, description, discount_type, discount_value, 
  free_shipping, min_order_value, max_uses, used_count,
  active, starts_at, expires_at, product_id, created_at
FROM public.coupons
WHERE active = true;

-- 2. Create ai_agents_public view (excludes system_prompt, model, temperature, allowed_panels, llm_override, channels)
CREATE OR REPLACE VIEW public.ai_agents_public AS
SELECT id, name, slug, description, icon, color, active
FROM public.ai_agents
WHERE active = true;

-- 3. Drop permissive public SELECT on coupons base table
DROP POLICY "Anyone can view active coupons" ON public.coupons;

-- 4. Drop permissive public SELECT on ai_agents base table  
DROP POLICY "Anyone can view active agents" ON public.ai_agents;
