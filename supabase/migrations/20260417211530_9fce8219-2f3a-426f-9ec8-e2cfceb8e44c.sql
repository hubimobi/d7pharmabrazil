-- ── Migration #7e: Lock down anonymous inserts to require valid tenant ──

-- 1. Helper: validates a tenant_id exists and is active
CREATE OR REPLACE FUNCTION public.is_valid_active_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = _tenant_id AND active = true
  )
$$;

-- 2. Tighten anon_insert on orders
DROP POLICY IF EXISTS "anon_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_anon_insert" ON public.orders;
CREATE POLICY "orders_anon_insert" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (
    customer_name IS NOT NULL
    AND total > 0
    AND tenant_id IS NOT NULL
    AND public.is_valid_active_tenant(tenant_id)
  );

-- 3. Tighten anon_insert on doctors
DROP POLICY IF EXISTS "anon_insert" ON public.doctors;
DROP POLICY IF EXISTS "doctors_anon_insert" ON public.doctors;
CREATE POLICY "doctors_anon_insert" ON public.doctors
  FOR INSERT TO anon
  WITH CHECK (
    name IS NOT NULL
    AND approval_status = 'pending'
    AND tenant_id IS NOT NULL
    AND public.is_valid_active_tenant(tenant_id)
  );

-- 4. Tighten anon_insert on abandoned_carts
DROP POLICY IF EXISTS "anon_insert" ON public.abandoned_carts;
DROP POLICY IF EXISTS "abandoned_carts_anon_insert" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts_anon_insert" ON public.abandoned_carts
  FOR INSERT TO anon
  WITH CHECK (
    customer_name IS NOT NULL
    AND tenant_id IS NOT NULL
    AND public.is_valid_active_tenant(tenant_id)
  );

-- 5. Tighten anon_insert on popup_leads
DROP POLICY IF EXISTS "anon_insert" ON public.popup_leads;
DROP POLICY IF EXISTS "popup_leads_anon_insert" ON public.popup_leads;
CREATE POLICY "popup_leads_anon_insert" ON public.popup_leads
  FOR INSERT TO anon
  WITH CHECK (
    email IS NOT NULL
    AND tenant_id IS NOT NULL
    AND public.is_valid_active_tenant(tenant_id)
  );

-- 6. Realtime channel authorization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='realtime' AND table_name='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_topic_subscription" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "tenant_topic_subscription" ON realtime.messages
        FOR SELECT TO authenticated
        USING (
          -- Topic must contain tenant_id user belongs to: e.g. "tenant:<uuid>:..."
          EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
              AND realtime.topic() LIKE 'tenant:' || tu.tenant_id::text || ':%'
          )
          OR public.is_super_admin()
        )
    $p$;
  END IF;
END$$;