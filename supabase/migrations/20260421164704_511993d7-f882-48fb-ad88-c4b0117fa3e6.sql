-- Restore controlled access to store_settings for admins
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;

-- Ensure RLS is on
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Drop previous overly-restrictive policies if they exist
DROP POLICY IF EXISTS "Authenticated admins can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Authenticated admins can insert store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Authenticated admins can update store settings" ON public.store_settings;

-- SELECT: admins/suporte/superadmin can read rows for tenants they belong to (or super_admin sees all)
CREATE POLICY "Authenticated admins can view store settings"
ON public.store_settings FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.has_any_role(auth.uid(), ARRAY['admin','super_admin','suporte','administrador']::app_role[])
    AND (tenant_id IS NULL OR tenant_id = ANY(public.get_user_tenant_ids()))
  )
);

-- INSERT
CREATE POLICY "Authenticated admins can insert store settings"
ON public.store_settings FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.has_any_role(auth.uid(), ARRAY['admin','super_admin','suporte','administrador']::app_role[])
    AND (tenant_id IS NULL OR tenant_id = ANY(public.get_user_tenant_ids()))
  )
);

-- UPDATE
CREATE POLICY "Authenticated admins can update store settings"
ON public.store_settings FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.has_any_role(auth.uid(), ARRAY['admin','super_admin','suporte','administrador']::app_role[])
    AND (tenant_id IS NULL OR tenant_id = ANY(public.get_user_tenant_ids()))
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.has_any_role(auth.uid(), ARRAY['admin','super_admin','suporte','administrador']::app_role[])
    AND (tenant_id IS NULL OR tenant_id = ANY(public.get_user_tenant_ids()))
  )
);