
-- 1. Add tenant_id to whatsapp_instances
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Add tenant_id to whatsapp_message_log
ALTER TABLE public.whatsapp_message_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 3. Add instance_id to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS instance_id uuid REFERENCES public.whatsapp_instances(id);

-- 4. Create whatsapp_instance_users table for access control
CREATE TABLE IF NOT EXISTS public.whatsapp_instance_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_send boolean NOT NULL DEFAULT true,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instance_id, user_id)
);

ALTER TABLE public.whatsapp_instance_users ENABLE ROW LEVEL SECURITY;

-- RLS for whatsapp_instance_users
CREATE POLICY "tenant_iso_select" ON public.whatsapp_instance_users
  FOR SELECT TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_insert" ON public.whatsapp_instance_users
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_update" ON public.whatsapp_instance_users
  FOR UPDATE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin())
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_delete" ON public.whatsapp_instance_users
  FOR DELETE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());

-- 5. Update existing RLS policies on whatsapp_instances
DROP POLICY IF EXISTS "Admins can manage whatsapp_instances" ON public.whatsapp_instances;

CREATE POLICY "tenant_iso_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin())
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());

-- 6. Update existing RLS policies on whatsapp_message_log
DROP POLICY IF EXISTS "Admins can manage whatsapp_message_log" ON public.whatsapp_message_log;

CREATE POLICY "tenant_iso_select" ON public.whatsapp_message_log
  FOR SELECT TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_insert" ON public.whatsapp_message_log
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "svc_all_message_log" ON public.whatsapp_message_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "svc_all_instances" ON public.whatsapp_instances
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7. Backfill existing instance with default tenant
UPDATE public.whatsapp_instances SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 8. Add index for performance
CREATE INDEX IF NOT EXISTS idx_wa_conversations_instance ON public.whatsapp_conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_log_tenant ON public.whatsapp_message_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_instances_tenant ON public.whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_instance_users_user ON public.whatsapp_instance_users(user_id);
