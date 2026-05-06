-- Enable RLS on whatsapp_campaigns (policies already exist)
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

-- Defensive: ensure no overly-permissive anon policy lingers on store_settings raw table
DROP POLICY IF EXISTS store_settings_public_select ON public.store_settings;
DROP POLICY IF EXISTS anon_select ON public.store_settings;

-- Lock down audit_log: only service_role may INSERT; revoke client INSERT
REVOKE INSERT ON public.audit_log FROM anon, authenticated;