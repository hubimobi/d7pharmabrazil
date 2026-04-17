-- Add verification fields to tenant_domains
ALTER TABLE public.tenant_domains
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_check_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Generate token for new domains
CREATE OR REPLACE FUNCTION public.gen_domain_verification_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_token IS NULL OR NEW.verification_token = '' THEN
    NEW.verification_token := 'lovable-verify=' || encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gen_domain_token ON public.tenant_domains;
CREATE TRIGGER trg_gen_domain_token
  BEFORE INSERT ON public.tenant_domains
  FOR EACH ROW EXECUTE FUNCTION public.gen_domain_verification_token();

-- Backfill existing rows missing token
UPDATE public.tenant_domains
SET verification_token = 'lovable-verify=' || encode(gen_random_bytes(16), 'hex')
WHERE verification_token IS NULL OR verification_token = '';

-- Enable RLS + policies (tenant admins manage their own domains)
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members read own domains" ON public.tenant_domains;
CREATE POLICY "Tenant members read own domains" ON public.tenant_domains
  FOR SELECT USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "Tenant admins insert domains" ON public.tenant_domains;
CREATE POLICY "Tenant admins insert domains" ON public.tenant_domains
  FOR INSERT WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "Tenant admins update domains" ON public.tenant_domains;
CREATE POLICY "Tenant admins update domains" ON public.tenant_domains
  FOR UPDATE USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "Tenant admins delete domains" ON public.tenant_domains;
CREATE POLICY "Tenant admins delete domains" ON public.tenant_domains
  FOR DELETE USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON public.tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_status ON public.tenant_domains(verification_status);