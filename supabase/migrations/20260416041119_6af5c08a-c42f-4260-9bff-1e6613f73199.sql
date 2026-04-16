
-- Table: whatsapp_sending_config
CREATE TABLE public.whatsapp_sending_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  messages_per_batch integer NOT NULL DEFAULT 10,
  batch_interval_seconds integer NOT NULL DEFAULT 30,
  batch_interval_variance integer NOT NULL DEFAULT 15,
  daily_global_limit integer NOT NULL DEFAULT 500,
  validate_numbers boolean NOT NULL DEFAULT true,
  warmup_mode boolean NOT NULL DEFAULT false,
  warmup_daily_increase integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.whatsapp_sending_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_iso_select" ON public.whatsapp_sending_config FOR SELECT TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "tenant_iso_insert" ON public.whatsapp_sending_config FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "tenant_iso_update" ON public.whatsapp_sending_config FOR UPDATE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin())
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "tenant_iso_delete" ON public.whatsapp_sending_config FOR DELETE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "svc_all" ON public.whatsapp_sending_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_whatsapp_sending_config_updated_at
  BEFORE UPDATE ON public.whatsapp_sending_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: whatsapp_number_validation
CREATE TABLE public.whatsapp_number_validation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  exists_on_whatsapp boolean NOT NULL DEFAULT false,
  validated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  UNIQUE(phone, tenant_id)
);

ALTER TABLE public.whatsapp_number_validation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_iso_select" ON public.whatsapp_number_validation FOR SELECT TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "tenant_iso_insert" ON public.whatsapp_number_validation FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "tenant_iso_update" ON public.whatsapp_number_validation FOR UPDATE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin())
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "tenant_iso_delete" ON public.whatsapp_number_validation FOR DELETE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());
CREATE POLICY "svc_all" ON public.whatsapp_number_validation FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_whatsapp_number_validation_phone ON public.whatsapp_number_validation(phone);
CREATE INDEX idx_whatsapp_number_validation_validated_at ON public.whatsapp_number_validation(validated_at);
