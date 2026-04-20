-- 1. Public read access to active products (tenant filter is enforced client-side via hostname-resolved tenant_id)
DROP POLICY IF EXISTS "products_public_select" ON public.products;
CREATE POLICY "products_public_select"
ON public.products
FOR SELECT
TO anon, authenticated
USING (active = true);

-- 2. Ensure the products_public view is granted to anon/authenticated
GRANT SELECT ON public.products_public TO anon, authenticated;

-- 3. Fix cross-tenant leak on whatsapp_instances admin policy
DROP POLICY IF EXISTS "whatsapp_instances_admin_select" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_admin_select"
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (tenant_id IS NOT NULL AND public.is_tenant_staff(tenant_id))
);