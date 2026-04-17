-- 1. Tabela tenant_integrations
CREATE TABLE public.tenant_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider),
  CONSTRAINT tenant_integrations_provider_check CHECK (
    provider IN ('bling', 'tiktok_shop', 'asaas', 'evolution', 'ghl', 'cloudflare', 'melhor_envio')
  )
);

CREATE INDEX idx_tenant_integrations_tenant ON public.tenant_integrations(tenant_id);
CREATE INDEX idx_tenant_integrations_provider ON public.tenant_integrations(provider);

-- 2. RLS
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage own integrations"
ON public.tenant_integrations
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_belongs_to_tenant(tenant_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte'))
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.user_belongs_to_tenant(tenant_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte'))
  )
);

-- 3. Triggers
CREATE TRIGGER trg_tenant_integrations_updated_at
BEFORE UPDATE ON public.tenant_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tenant_integrations_ensure_tenant
BEFORE INSERT ON public.tenant_integrations
FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();

-- 4. Migrar dados existentes (Bling) → tenant principal
INSERT INTO public.tenant_integrations (tenant_id, provider, credentials, active)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  'bling',
  jsonb_build_object(
    'access_token', access_token,
    'refresh_token', refresh_token,
    'expires_at', expires_at
  ),
  true
FROM public.bling_tokens
ORDER BY updated_at DESC NULLS LAST
LIMIT 1
ON CONFLICT (tenant_id, provider) DO NOTHING;

-- 5. Migrar dados existentes (TikTok Shop) → tenant principal
INSERT INTO public.tenant_integrations (tenant_id, provider, credentials, active)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  'tiktok_shop',
  jsonb_build_object(
    'access_token', access_token,
    'refresh_token', refresh_token,
    'expires_at', expires_at,
    'shop_id', shop_id,
    'shop_name', shop_name
  ),
  true
FROM public.tiktok_tokens
ORDER BY updated_at DESC NULLS LAST
LIMIT 1
ON CONFLICT (tenant_id, provider) DO NOTHING;