-- ── Migration 1: Tenant isolation for OAuth tokens ──

-- 1. Add tenant_id to bling_tokens
ALTER TABLE public.bling_tokens
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill existing rows to default tenant
UPDATE public.bling_tokens
  SET tenant_id = '00000000-0000-0000-0000-000000000000'
  WHERE tenant_id IS NULL;

ALTER TABLE public.bling_tokens
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

CREATE UNIQUE INDEX IF NOT EXISTS bling_tokens_tenant_uniq ON public.bling_tokens(tenant_id);

-- 2. Add tenant_id to tiktok_tokens
ALTER TABLE public.tiktok_tokens
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.tiktok_tokens
  SET tenant_id = '00000000-0000-0000-0000-000000000000'
  WHERE tenant_id IS NULL;

ALTER TABLE public.tiktok_tokens
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

CREATE INDEX IF NOT EXISTS tiktok_tokens_tenant_idx ON public.tiktok_tokens(tenant_id);

-- 3. Drop old permissive policies on both tables
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('bling_tokens','tiktok_tokens')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END$$;

-- 4. Re-create tenant-scoped policies
ALTER TABLE public.bling_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_tokens ENABLE ROW LEVEL SECURITY;

-- bling_tokens
CREATE POLICY "bling_tokens_tenant_select" ON public.bling_tokens
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "bling_tokens_tenant_insert" ON public.bling_tokens
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "bling_tokens_tenant_update" ON public.bling_tokens
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "bling_tokens_tenant_delete" ON public.bling_tokens
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

-- tiktok_tokens
CREATE POLICY "tiktok_tokens_tenant_select" ON public.tiktok_tokens
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "tiktok_tokens_tenant_insert" ON public.tiktok_tokens
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "tiktok_tokens_tenant_update" ON public.tiktok_tokens
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "tiktok_tokens_tenant_delete" ON public.tiktok_tokens
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

-- 5. Auto-fill tenant_id on insert via trigger
DROP TRIGGER IF EXISTS bling_tokens_set_tenant ON public.bling_tokens;
CREATE TRIGGER bling_tokens_set_tenant
  BEFORE INSERT ON public.bling_tokens
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();

DROP TRIGGER IF EXISTS tiktok_tokens_set_tenant ON public.tiktok_tokens;
CREATE TRIGGER tiktok_tokens_set_tenant
  BEFORE INSERT ON public.tiktok_tokens
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();