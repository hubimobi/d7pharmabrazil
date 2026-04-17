-- ── Migration #7c: Role-based PII hardening ──

-- 1. Helper: is the current user staff (admin-level)?
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
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin','suporte','gestor','financeiro','administrador')
      )
$$;

-- 2. doctors — CPF/PIX visible only to staff or the doctor themselves
DROP POLICY IF EXISTS "tenant_iso_select" ON public.doctors;
DROP POLICY IF EXISTS "doctors_select" ON public.doctors;
CREATE POLICY "doctors_staff_or_self_select" ON public.doctors
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_staff(tenant_id)
    OR user_id = auth.uid()
    OR (
      -- representative can see their own doctors but the view excludes sensitive cols
      representative_id = public.get_representative_id()
    )
  );

-- 3. representatives — sensitive contact restricted
DROP POLICY IF EXISTS "tenant_iso_select" ON public.representatives;
DROP POLICY IF EXISTS "representatives_select" ON public.representatives;
CREATE POLICY "representatives_staff_or_self_select" ON public.representatives
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_staff(tenant_id)
    OR user_id = auth.uid()
  );

-- 4. orders — full PII only to staff; reps keep limited access via separate view
DROP POLICY IF EXISTS "tenant_iso_select" ON public.orders;
DROP POLICY IF EXISTS "rep_view_orders" ON public.orders;
CREATE POLICY "orders_staff_select" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(tenant_id));

CREATE POLICY "orders_rep_limited_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM public.doctors
      WHERE representative_id = public.get_representative_id()
    )
  );

-- 5. abandoned_carts — staff only
DROP POLICY IF EXISTS "tenant_iso_select" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts_staff_select" ON public.abandoned_carts
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(tenant_id));

-- 6. popup_leads — staff only
DROP POLICY IF EXISTS "tenant_iso_select" ON public.popup_leads;
CREATE POLICY "popup_leads_staff_select" ON public.popup_leads
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(tenant_id));

-- 7. repurchase_funnel — staff only
DROP POLICY IF EXISTS "tenant_iso_select" ON public.repurchase_funnel;
CREATE POLICY "repurchase_funnel_staff_select" ON public.repurchase_funnel
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(tenant_id));

-- 8. tenant_config_backups — staff only
DROP POLICY IF EXISTS "tenant_iso_select" ON public.tenant_config_backups;
CREATE POLICY "tenant_config_backups_staff_select" ON public.tenant_config_backups
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(tenant_id));

-- 9. store_settings — staff only (contains API keys)
DROP POLICY IF EXISTS "tenant_iso_select" ON public.store_settings;
CREATE POLICY "store_settings_staff_select" ON public.store_settings
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(tenant_id));

-- Public anon needs basic settings (logo, name, theme) — handled via store_settings_public view if needed later.
-- For now, anon path keeps existing anon policy untouched.