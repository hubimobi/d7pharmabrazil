
-- =============================================
-- PHASE 1 COMPLETE — Migrations 1.1 → 1.12
-- =============================================

-- 1.1: Expand tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'basic';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS system_version TEXT DEFAULT 'latest';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS allowed_modules JSONB DEFAULT '{"whatsapp":false,"ai":false,"repurchase_funnel":false,"upsell":false,"analytics":true,"coupons":true}';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_user_id UUID;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_products INT DEFAULT 100;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 5;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cloning_status TEXT;

DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check CHECK (plan IN ('basic','pro','enterprise'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_status_ck CHECK (status IN ('active','suspended','trial','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_cloning_ck CHECK (cloning_status IS NULL OR cloning_status IN ('pending','cloning','done','error'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.tenants SET
  plan = 'enterprise', status = 'active', max_products = 9999, max_users = 99,
  allowed_modules = '{"whatsapp":true,"ai":true,"repurchase_funnel":true,"upsell":true,"analytics":true,"coupons":true}'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 1.2: tenant_domains
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL, is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ, ssl_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON public.tenant_domains(tenant_id);
INSERT INTO public.tenant_domains (tenant_id, domain, is_primary, verified_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'd7pharmabrasil.com.br', true, now())
ON CONFLICT (domain) DO NOTHING;

-- 1.3: tenant_config_backups
CREATE TABLE IF NOT EXISTS public.tenant_config_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  backup_type TEXT DEFAULT 'auto_pre_update' CHECK (backup_type IN ('auto_pre_update','manual','pre_clone')),
  table_name TEXT NOT NULL, data JSONB NOT NULL, created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(), notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_backups_tenant_created ON public.tenant_config_backups(tenant_id, created_at DESC);

-- 1.4: tenant_clones_log
CREATE TABLE IF NOT EXISTS public.tenant_clones_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tenant_id UUID REFERENCES public.tenants(id),
  target_tenant_id UUID REFERENCES public.tenants(id),
  initiated_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','done','error')),
  error_message TEXT, tables_cloned TEXT[],
  started_at TIMESTAMPTZ DEFAULT now(), finished_at TIMESTAMPTZ
);

-- 1.5: Add tenant_id to 30 tables + backfill
ALTER TABLE public.abandoned_carts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.static_pages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_combos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_faqs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_testimonials ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.link_clicks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.link_conversions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.popup_leads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.customer_tags ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.repurchase_funnel ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.repurchase_goals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_knowledge_bases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_kb_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_agent_knowledge_bases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_chat_messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_meetings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_system_prompts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_token_usage ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.ai_llm_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.campaign_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.manufacturers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_groups ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- visitor_events (conditional) - fixed dollar quoting
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visitor_events') THEN
    EXECUTE 'ALTER TABLE public.visitor_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id)';
    EXECUTE 'UPDATE public.visitor_events SET tenant_id = ''00000000-0000-0000-0000-000000000000'' WHERE tenant_id IS NULL';
  END IF;
END $block$;

-- Backfill
UPDATE public.abandoned_carts SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.coupons SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.hero_banners SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.promo_banners SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.static_pages SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.product_combos SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.product_faqs SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.product_testimonials SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.short_links SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.link_clicks SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.link_conversions SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.popup_leads SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.customer_tags SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.repurchase_funnel SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.repurchase_goals SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_agents SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_knowledge_bases SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_kb_items SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_agent_knowledge_bases SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_chat_messages SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_meetings SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_system_prompts SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_token_usage SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.ai_llm_config SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.campaign_config SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.admin_notifications SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.integration_logs SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.manufacturers SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.product_groups SET tenant_id='00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 1.6: Composite indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON public.orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON public.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_created ON public.products(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tenant_slug ON public.products(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_store_settings_tenant ON public.store_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON public.doctors(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_representatives_tenant ON public.representatives(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_tenant ON public.commissions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hero_banners_tenant ON public.hero_banners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promo_banners_tenant ON public.promo_banners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_static_pages_tenant_slug ON public.static_pages(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON public.coupons(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_product_combos_tenant ON public.product_combos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_faqs_tenant ON public.product_faqs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_testimonials_tenant ON public.product_testimonials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manufacturers_tenant ON public.manufacturers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_groups_tenant ON public.product_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_tenant ON public.abandoned_carts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_links_tenant ON public.short_links(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_link_clicks_tenant ON public.link_clicks(tenant_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_conversions_tenant ON public.link_conversions(tenant_id, converted_at DESC);
CREATE INDEX IF NOT EXISTS idx_popup_leads_tenant ON public.popup_leads(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tenant ON public.customer_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_repurchase_funnel_tenant ON public.repurchase_funnel(tenant_id);
CREATE INDEX IF NOT EXISTS idx_repurchase_goals_tenant ON public.repurchase_goals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_tenant ON public.ai_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_bases_tenant ON public.ai_knowledge_bases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_kb_items_tenant ON public.ai_kb_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_tenant ON public.ai_chat_messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_tenant ON public.ai_token_usage(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_system_prompts_tenant ON public.ai_system_prompts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_config_tenant ON public.campaign_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_tenant ON public.admin_notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_tenant ON public.integration_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visitor_events') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visitor_events_tenant ON public.visitor_events(tenant_id, created_at DESC)';
  END IF;
END $block$;

-- 1.7: Security helper functions
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
    (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1)
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(tenant_id) FROM public.tenant_users WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = uid AND role = 'super_admin')
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'super_admin')
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(tid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND tenant_id = tid)
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 1.8: RLS policies - Drop old, enable RLS, create tenant isolation
DO $block$
DECLARE
  _tbl TEXT;
  _tables TEXT[] := ARRAY[
    'abandoned_carts','admin_notifications','ai_agent_knowledge_bases','ai_agents',
    'ai_chat_messages','ai_kb_items','ai_knowledge_bases','ai_llm_config',
    'ai_meetings','ai_system_prompts','ai_token_usage','campaign_config',
    'commissions','coupons','customer_tags','doctors','hero_banners',
    'integration_logs','link_clicks','link_conversions','manufacturers',
    'orders','popup_leads','product_combos','product_faqs','product_groups',
    'product_testimonials','products','promo_banners','representatives',
    'repurchase_funnel','repurchase_goals','short_links','static_pages',
    'store_settings','tenant_domains','tenant_config_backups'
  ];
  _pol RECORD;
BEGIN
  FOREACH _tbl IN ARRAY _tables LOOP
    FOR _pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=_tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _pol.policyname, _tbl);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', _tbl);
    EXECUTE format('CREATE POLICY "tenant_iso_select" ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())', _tbl);
    EXECUTE format('CREATE POLICY "tenant_iso_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin())', _tbl);
    EXECUTE format('CREATE POLICY "tenant_iso_update" ON public.%I FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin())', _tbl);
    EXECUTE format('CREATE POLICY "tenant_iso_delete" ON public.%I FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())', _tbl);
  END LOOP;
END $block$;

-- tenant_clones_log: super_admin only
ALTER TABLE public.tenant_clones_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_clones_log FORCE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all" ON public.tenant_clones_log FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Anon SELECT for storefront
CREATE POLICY "anon_select" ON public.products FOR SELECT TO anon USING (active = true);
CREATE POLICY "anon_select" ON public.hero_banners FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.promo_banners FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.static_pages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.product_combos FOR SELECT TO anon USING (active = true);
CREATE POLICY "anon_select" ON public.product_faqs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.product_testimonials FOR SELECT TO anon USING (approved = true);
CREATE POLICY "anon_select" ON public.store_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.manufacturers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.product_groups FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON public.short_links FOR SELECT TO anon USING (active = true);

-- Anon INSERT for checkout
CREATE POLICY "anon_insert" ON public.orders FOR INSERT TO anon WITH CHECK (customer_name IS NOT NULL AND total > 0);
CREATE POLICY "anon_select_deny" ON public.orders FOR SELECT TO anon USING (false);
CREATE POLICY "anon_insert" ON public.abandoned_carts FOR INSERT TO anon WITH CHECK (customer_name IS NOT NULL AND customer_name <> '');
CREATE POLICY "anon_insert" ON public.popup_leads FOR INSERT TO anon WITH CHECK (email IS NOT NULL AND email <> '' AND email LIKE '%@%.%');
CREATE POLICY "anon_insert" ON public.link_clicks FOR INSERT TO anon WITH CHECK (short_link_id IS NOT NULL);
CREATE POLICY "anon_insert" ON public.link_conversions FOR INSERT TO anon WITH CHECK (short_link_id IS NOT NULL);
CREATE POLICY "anon_insert" ON public.doctors FOR INSERT TO anon WITH CHECK (name IS NOT NULL AND name <> '' AND approval_status = 'pending');
CREATE POLICY "anon_select_deny" ON public.doctors FOR SELECT TO anon USING (false);

-- Special role-based policies
CREATE POLICY "rep_view_orders" ON public.orders FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE representative_id = public.get_representative_id()));
CREATE POLICY "rep_view_commissions" ON public.commissions FOR SELECT TO authenticated
  USING (representative_id = public.get_representative_id());
CREATE POLICY "prescriber_view_commissions" ON public.commissions FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));
CREATE POLICY "staff_view_coupons" ON public.coupons FOR SELECT TO authenticated
  USING (active = true AND public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','suporte','gestor','financeiro','representative']::app_role[]));
CREATE POLICY "rep_view_coupons" ON public.coupons FOR SELECT TO authenticated
  USING (representative_id = public.get_representative_id()
    OR doctor_id IN (SELECT id FROM public.doctors WHERE representative_id = public.get_representative_id()));
CREATE POLICY "rep_manage_doctors" ON public.doctors FOR ALL TO authenticated
  USING (representative_id = public.get_representative_id()) WITH CHECK (representative_id = public.get_representative_id());
CREATE POLICY "prescriber_view_self" ON public.doctors FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "self_view" ON public.representatives FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_messages" ON public.ai_chat_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_meetings" ON public.ai_meetings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "auth_read_prompts" ON public.ai_system_prompts FOR SELECT TO authenticated USING (true);

-- Service role policies
CREATE POLICY "svc_insert_notifications" ON public.admin_notifications FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "svc_insert_token_usage" ON public.ai_token_usage FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "svc_insert_logs" ON public.integration_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "svc_all_orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_carts" ON public.abandoned_carts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_commissions" ON public.commissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_short_links" ON public.short_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- visitor_events RLS (conditional)
DO $block$
DECLARE
  _p RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visitor_events') THEN
    FOR _p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='visitor_events' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.visitor_events', _p.policyname);
    END LOOP;
    EXECUTE 'ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.visitor_events FORCE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "tenant_iso_select" ON public.visitor_events FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_iso_insert" ON public.visitor_events FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_iso_update" ON public.visitor_events FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_iso_delete" ON public.visitor_events FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "anon_insert" ON public.visitor_events FOR INSERT TO anon WITH CHECK (true)';
  END IF;
END $block$;

-- 1.9: Storage policies (additive for /tenants/ path)
DROP POLICY IF EXISTS "tenant_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_public" ON storage.objects;

CREATE POLICY "tenant_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING ((storage.foldername(name))[1] = 'tenants' AND ((storage.foldername(name))[2] = public.current_tenant_id()::text OR public.is_super_admin()));
CREATE POLICY "tenant_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((storage.foldername(name))[1] = 'tenants' AND ((storage.foldername(name))[2] = public.current_tenant_id()::text OR public.is_super_admin()));
CREATE POLICY "tenant_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING ((storage.foldername(name))[1] = 'tenants' AND ((storage.foldername(name))[2] = public.current_tenant_id()::text OR public.is_super_admin()))
  WITH CHECK ((storage.foldername(name))[1] = 'tenants' AND ((storage.foldername(name))[2] = public.current_tenant_id()::text OR public.is_super_admin()));
CREATE POLICY "tenant_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING ((storage.foldername(name))[1] = 'tenants' AND ((storage.foldername(name))[2] = public.current_tenant_id()::text OR public.is_super_admin()));
CREATE POLICY "tenant_storage_public" ON storage.objects FOR SELECT TO anon
  USING ((storage.foldername(name))[1] = 'tenants');

-- 1.10: Backup triggers
CREATE OR REPLACE FUNCTION public.backup_before_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenant_config_backups (tenant_id, table_name, data, backup_type)
  VALUES (OLD.tenant_id, TG_TABLE_NAME, row_to_json(OLD)::jsonb, 'auto_pre_update');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS backup_store_settings ON public.store_settings;
CREATE TRIGGER backup_store_settings BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.backup_before_update();
DROP TRIGGER IF EXISTS backup_hero_banners ON public.hero_banners;
CREATE TRIGGER backup_hero_banners BEFORE UPDATE ON public.hero_banners FOR EACH ROW EXECUTE FUNCTION public.backup_before_update();
DROP TRIGGER IF EXISTS backup_promo_banners ON public.promo_banners;
CREATE TRIGGER backup_promo_banners BEFORE UPDATE ON public.promo_banners FOR EACH ROW EXECUTE FUNCTION public.backup_before_update();

-- 1.11: pg_cron cleanup
DO $block$
BEGIN
  PERFORM cron.schedule('clean-old-backups', '0 3 * * *',
    'DELETE FROM public.tenant_config_backups WHERE created_at < now() - interval ''30 days''');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available: %', SQLERRM;
END $block$;

-- 1.12: updated_at trigger on tenants
DROP TRIGGER IF EXISTS tenants_updated_at ON public.tenants;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
