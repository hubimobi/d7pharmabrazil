-- ── Migration 2: Tenant isolation for WhatsApp funnels & templates ──

-- 1. Add tenant_id columns where missing
ALTER TABLE public.whatsapp_funnels
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_funnel_steps
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
-- whatsapp_template_folders already has tenant_id

-- 2. Backfill to default tenant
UPDATE public.whatsapp_funnels SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.whatsapp_funnel_steps SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.whatsapp_templates SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.whatsapp_template_folders SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 3. Set NOT NULL + default
ALTER TABLE public.whatsapp_funnels
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();
ALTER TABLE public.whatsapp_funnel_steps
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();
ALTER TABLE public.whatsapp_templates
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();
ALTER TABLE public.whatsapp_template_folders
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

-- 4. Indexes
CREATE INDEX IF NOT EXISTS whatsapp_funnels_tenant_idx ON public.whatsapp_funnels(tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_funnel_steps_tenant_idx ON public.whatsapp_funnel_steps(tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_templates_tenant_idx ON public.whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_template_folders_tenant_idx ON public.whatsapp_template_folders(tenant_id);

-- 5. Drop old policies on all 4 tables
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public' AND tablename IN
      ('whatsapp_funnels','whatsapp_funnel_steps','whatsapp_templates','whatsapp_template_folders')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END$$;

-- 6. Enable RLS
ALTER TABLE public.whatsapp_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_folders ENABLE ROW LEVEL SECURITY;

-- 7. Tenant-scoped policies (4 tables × 4 ops)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['whatsapp_funnels','whatsapp_funnel_steps','whatsapp_templates','whatsapp_template_folders']
  LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_tenant_select" ON public.%1$I
        FOR SELECT TO authenticated
        USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());
      CREATE POLICY "%1$s_tenant_insert" ON public.%1$I
        FOR INSERT TO authenticated
        WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());
      CREATE POLICY "%1$s_tenant_update" ON public.%1$I
        FOR UPDATE TO authenticated
        USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
        WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());
      CREATE POLICY "%1$s_tenant_delete" ON public.%1$I
        FOR DELETE TO authenticated
        USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());
    $f$, t);
  END LOOP;
END$$;

-- 8. Auto-fill tenant_id triggers
DROP TRIGGER IF EXISTS whatsapp_funnels_set_tenant ON public.whatsapp_funnels;
CREATE TRIGGER whatsapp_funnels_set_tenant BEFORE INSERT ON public.whatsapp_funnels
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();

DROP TRIGGER IF EXISTS whatsapp_funnel_steps_set_tenant ON public.whatsapp_funnel_steps;
CREATE TRIGGER whatsapp_funnel_steps_set_tenant BEFORE INSERT ON public.whatsapp_funnel_steps
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();

DROP TRIGGER IF EXISTS whatsapp_templates_set_tenant ON public.whatsapp_templates;
CREATE TRIGGER whatsapp_templates_set_tenant BEFORE INSERT ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();

DROP TRIGGER IF EXISTS whatsapp_template_folders_set_tenant ON public.whatsapp_template_folders;
CREATE TRIGGER whatsapp_template_folders_set_tenant BEFORE INSERT ON public.whatsapp_template_folders
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();