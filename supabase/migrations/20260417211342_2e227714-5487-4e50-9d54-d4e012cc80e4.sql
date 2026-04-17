-- ── Migration #7d: Fix remaining critical issues ──

-- 1. is_tenant_staff: remove the tenant-unscoped user_roles branch
CREATE OR REPLACE FUNCTION public.is_tenant_staff(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.tenant_users tu
        WHERE tu.user_id = auth.uid()
          AND tu.tenant_id = _tenant_id
          AND tu.role IN ('admin','suporte','gestor','financeiro','administrador')
      )
$$;

-- 2. whatsapp_flow_split_state: remove anonymous write access + null tenant bypass
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_flow_split_state'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_flow_split_state', p.policyname);
  END LOOP;
END$$;

ALTER TABLE public.whatsapp_flow_split_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wfss_tenant_select" ON public.whatsapp_flow_split_state
  FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "wfss_tenant_insert" ON public.whatsapp_flow_split_state
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "wfss_tenant_update" ON public.whatsapp_flow_split_state
  FOR UPDATE TO authenticated
  USING (tenant_id IS NOT NULL AND public.user_belongs_to_tenant(tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "wfss_tenant_delete" ON public.whatsapp_flow_split_state
  FOR DELETE TO authenticated
  USING (tenant_id IS NOT NULL AND public.user_belongs_to_tenant(tenant_id));

-- 3. products: remove anon access to cost_price by replacing anon policy
DROP POLICY IF EXISTS "anon_select" ON public.products;
DROP POLICY IF EXISTS "products_anon_select" ON public.products;

-- Anon must use products_public view (already excludes cost_price). 
-- Authenticated staff can still read full table via existing tenant policies.
CREATE POLICY "products_authenticated_select" ON public.products
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_tenant(tenant_id)
    OR public.is_super_admin()
  );