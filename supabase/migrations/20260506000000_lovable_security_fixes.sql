-- Fix store_settings access
ALTER VIEW public.store_settings_public SET (security_invoker = off);
ALTER VIEW public.store_settings_safe SET (security_invoker = off);

DROP POLICY IF EXISTS store_settings_public_select ON public.store_settings;
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "anon_select" ON public.store_settings;

REVOKE SELECT ON public.store_settings FROM anon;
REVOKE SELECT ON public.store_settings FROM public;

-- Fix whatsapp_campaigns explicitly adding TO authenticated
DROP POLICY IF EXISTS "Users can see their own tenant campaigns" ON public.whatsapp_campaigns;
CREATE POLICY "Users can see their own tenant campaigns"
  ON public.whatsapp_campaigns FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own tenant campaigns" ON public.whatsapp_campaigns;
CREATE POLICY "Users can insert their own tenant campaigns"
  ON public.whatsapp_campaigns FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own tenant campaigns" ON public.whatsapp_campaigns;
CREATE POLICY "Users can update their own tenant campaigns"
  ON public.whatsapp_campaigns FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Fix whatsapp_flow_versions missing RLS
ALTER TABLE public.whatsapp_flow_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own tenant flow versions" ON public.whatsapp_flow_versions;
CREATE POLICY "Users can see their own tenant flow versions"
  ON public.whatsapp_flow_versions FOR SELECT TO authenticated
  USING (
    flow_id IN (
      SELECT f.id FROM public.whatsapp_flows f
      JOIN public.tenant_users tu ON tu.tenant_id = f.tenant_id
      WHERE tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own tenant flow versions" ON public.whatsapp_flow_versions;
CREATE POLICY "Users can insert their own tenant flow versions"
  ON public.whatsapp_flow_versions FOR INSERT TO authenticated
  WITH CHECK (
    flow_id IN (
      SELECT f.id FROM public.whatsapp_flows f
      JOIN public.tenant_users tu ON tu.tenant_id = f.tenant_id
      WHERE tu.user_id = auth.uid()
    )
  );

-- Fix audit log arbitrary insert by removing the policy (trigger does it securely)
DROP POLICY IF EXISTS "audit_log_insert_system" ON public.audit_log;

-- Add check to tenant_users to avoid arbitrary roles warning
DO $$ 
BEGIN
  -- First, fix any existing invalid data
  UPDATE public.tenant_users 
  SET role = 'admin' 
  WHERE role NOT IN ('super_admin', 'admin', 'administrador', 'suporte', 'atendente', 'vendedor', 'gestor', 'user')
     OR role IS NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_tenant_user_roles') THEN
    ALTER TABLE public.tenant_users ADD CONSTRAINT check_tenant_user_roles CHECK (role IN ('super_admin', 'admin', 'administrador', 'suporte', 'atendente', 'vendedor', 'gestor', 'user'));
  END IF;
END $$;
