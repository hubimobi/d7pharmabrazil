
-- 1. Restrict tenant_users SELECT
DROP POLICY IF EXISTS "Users can view own tenant users" ON public.tenant_users;
DROP POLICY IF EXISTS "Admins can view own tenant users" ON public.tenant_users;

CREATE POLICY "tenant_users_self_select" ON public.tenant_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "tenant_users_staff_select" ON public.tenant_users
FOR SELECT TO authenticated
USING (public.is_tenant_staff(tenant_id));

-- 2. Hide products.cost_price from anonymous visitors
REVOKE SELECT (cost_price) ON public.products FROM anon;
