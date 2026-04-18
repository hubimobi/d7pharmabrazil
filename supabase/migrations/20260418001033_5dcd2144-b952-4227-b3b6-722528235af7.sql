-- Fix infinite recursion in tenant_users RLS by using SECURITY DEFINER function
DROP POLICY IF EXISTS "Admins can view own tenant users" ON public.tenant_users;

CREATE POLICY "Users can view own tenant users"
ON public.tenant_users
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_super_admin()
  OR tenant_id = ANY(public.get_user_tenant_ids())
);