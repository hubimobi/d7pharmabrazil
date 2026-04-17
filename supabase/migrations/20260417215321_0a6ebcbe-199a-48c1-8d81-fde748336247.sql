
-- 1. Restrict tenant_domains policies to authenticated role only
DROP POLICY IF EXISTS "Tenant admins delete domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "Tenant admins insert domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "Tenant admins update domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "Tenant members read own domains" ON public.tenant_domains;

CREATE POLICY "Tenant members read own domains"
ON public.tenant_domains FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "Tenant admins insert domains"
ON public.tenant_domains FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_staff(tenant_id));

CREATE POLICY "Tenant admins update domains"
ON public.tenant_domains FOR UPDATE TO authenticated
USING (public.is_tenant_staff(tenant_id))
WITH CHECK (public.is_tenant_staff(tenant_id));

CREATE POLICY "Tenant admins delete domains"
ON public.tenant_domains FOR DELETE TO authenticated
USING (public.is_tenant_staff(tenant_id));

-- 2. Restrict tenant_integrations DELETE/UPDATE to admin role only (suporte loses write access on credentials)
DROP POLICY IF EXISTS "Tenant admins manage own integrations" ON public.tenant_integrations;

CREATE POLICY "Tenant staff read integrations"
ON public.tenant_integrations FOR SELECT TO authenticated
USING (public.is_tenant_staff(tenant_id));

CREATE POLICY "Tenant admins insert integrations"
ON public.tenant_integrations FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = tenant_integrations.tenant_id
      AND tu.role IN ('admin','administrador')
  )
);

CREATE POLICY "Tenant admins update integrations"
ON public.tenant_integrations FOR UPDATE TO authenticated
USING (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = tenant_integrations.tenant_id
      AND tu.role IN ('admin','administrador')
  )
)
WITH CHECK (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = tenant_integrations.tenant_id
      AND tu.role IN ('admin','administrador')
  )
);

CREATE POLICY "Tenant admins delete integrations"
ON public.tenant_integrations FOR DELETE TO authenticated
USING (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = tenant_integrations.tenant_id
      AND tu.role IN ('admin','administrador')
  )
);

-- 3. Restrict store_settings credential reads to admin role only
-- Keep general staff read but create a stricter policy for the table; full hardening would require column-level security.
-- We add a helper view for non-credential reads in a follow-up; for now, document via comment.
COMMENT ON COLUMN public.store_settings.evolution_api_key IS 'Sensitive: WhatsApp API key. Avoid exposing to gestor/financeiro roles in UI.';
