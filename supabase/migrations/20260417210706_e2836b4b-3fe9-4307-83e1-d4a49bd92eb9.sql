-- ── Migration 3: Privilege escalation hardening + cleanup ──

-- 1. Make current_tenant_id() deterministic
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- 2. Restrict user_roles management to super_admin only
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', p.policyname);
  END LOOP;
END$$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own roles; super_admins can read all
CREATE POLICY "user_roles_self_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

-- Only super_admins can write
CREATE POLICY "user_roles_super_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "user_roles_super_admin_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "user_roles_super_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 3. Block self-promotion to super_admin via trigger (defense in depth)
CREATE OR REPLACE FUNCTION public.prevent_super_admin_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NEW.user_id = auth.uid() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Cannot self-grant super_admin role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_block_self_super_admin ON public.user_roles;
CREATE TRIGGER user_roles_block_self_super_admin
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_self_grant();

-- 4. Remove permissive policy on ai_system_prompts
DROP POLICY IF EXISTS "auth_read_prompts" ON public.ai_system_prompts;
DROP POLICY IF EXISTS "Authenticated users can read prompts" ON public.ai_system_prompts;