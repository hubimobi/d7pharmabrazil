
-- Plan definitions: declarative limits per plan tier
CREATE TABLE public.plan_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  price_brl numeric NOT NULL DEFAULT 0,
  -- Limits: NULL means unlimited
  max_products integer,
  max_orders_per_month integer,
  max_whatsapp_contacts integer,
  max_ai_messages_per_month integer,
  max_custom_domains integer,
  max_users integer,
  -- Modules
  allowed_modules jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_definitions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans (needed for signup page)
CREATE POLICY "plans_public_read" ON public.plan_definitions
  FOR SELECT USING (active = true);

-- Only super_admin can manage
CREATE POLICY "plans_super_admin_all" ON public.plan_definitions
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_plan_def_updated
  BEFORE UPDATE ON public.plan_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: all plans unlimited for now (user wants free for testing)
INSERT INTO public.plan_definitions (plan_key, display_name, price_brl, max_products, max_orders_per_month, max_whatsapp_contacts, max_ai_messages_per_month, max_custom_domains, max_users, allowed_modules, sort_order) VALUES
  ('trial', 'Trial', 0, NULL, NULL, NULL, NULL, NULL, NULL, '{"whatsapp":true,"ai":true,"repurchase_funnel":true,"upsell":true,"analytics":true,"coupons":true,"custom_domain":true}'::jsonb, 0),
  ('free', 'Free', 0, NULL, NULL, NULL, NULL, NULL, NULL, '{"whatsapp":true,"ai":true,"repurchase_funnel":true,"upsell":true,"analytics":true,"coupons":true,"custom_domain":true}'::jsonb, 1),
  ('basic', 'Básico', 97, NULL, NULL, NULL, NULL, NULL, NULL, '{"whatsapp":true,"ai":true,"repurchase_funnel":true,"upsell":true,"analytics":true,"coupons":true,"custom_domain":true}'::jsonb, 2),
  ('pro', 'Pro', 297, NULL, NULL, NULL, NULL, NULL, NULL, '{"whatsapp":true,"ai":true,"repurchase_funnel":true,"upsell":true,"analytics":true,"coupons":true,"custom_domain":true}'::jsonb, 3),
  ('enterprise', 'Enterprise', 997, NULL, NULL, NULL, NULL, NULL, NULL, '{"whatsapp":true,"ai":true,"repurchase_funnel":true,"upsell":true,"analytics":true,"coupons":true,"custom_domain":true}'::jsonb, 4);
