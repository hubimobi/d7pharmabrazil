
-- Add tenant_id to whatsapp_message_queue
ALTER TABLE public.whatsapp_message_queue ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Backfill existing queue rows to primary tenant
UPDATE public.whatsapp_message_queue SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- Add tenant_id to whatsapp_contacts
ALTER TABLE public.whatsapp_contacts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Backfill existing contacts to primary tenant
UPDATE public.whatsapp_contacts SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 1. Fix whatsapp_message_queue policies
DROP POLICY IF EXISTS "Admins can manage whatsapp_message_queue" ON public.whatsapp_message_queue;

CREATE POLICY "staff_select_queue" ON public.whatsapp_message_queue
  FOR SELECT TO authenticated
  USING (
    (tenant_id = current_tenant_id() OR is_super_admin())
  );

CREATE POLICY "staff_insert_queue" ON public.whatsapp_message_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id = current_tenant_id() OR is_super_admin())
  );

CREATE POLICY "staff_update_queue" ON public.whatsapp_message_queue
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "staff_delete_queue" ON public.whatsapp_message_queue
  FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "svc_all_queue" ON public.whatsapp_message_queue
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Fix whatsapp_contacts policies
DROP POLICY IF EXISTS "Admins can manage whatsapp contacts" ON public.whatsapp_contacts;

CREATE POLICY "staff_select_contacts" ON public.whatsapp_contacts
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "staff_insert_contacts" ON public.whatsapp_contacts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "staff_update_contacts" ON public.whatsapp_contacts
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "staff_delete_contacts" ON public.whatsapp_contacts
  FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "svc_all_contacts" ON public.whatsapp_contacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Fix whatsapp_message_log: add missing UPDATE/DELETE
CREATE POLICY "staff_update_log" ON public.whatsapp_message_log
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "staff_delete_log" ON public.whatsapp_message_log
  FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- 4. Backfill tenant_users for admin users missing tenant link
INSERT INTO public.tenant_users (user_id, tenant_id, role)
VALUES 
  ('b77dab90-a65c-49dd-af73-dcca2fe29c55', '00000000-0000-0000-0000-000000000000', 'admin'),
  ('32efa0bf-4922-4b33-8452-e791e3dec7eb', '00000000-0000-0000-0000-000000000000', 'admin'),
  ('0f522ae6-de3f-4233-b1eb-4bcdab1a62d0', '00000000-0000-0000-0000-000000000000', 'administrador')
ON CONFLICT DO NOTHING;
