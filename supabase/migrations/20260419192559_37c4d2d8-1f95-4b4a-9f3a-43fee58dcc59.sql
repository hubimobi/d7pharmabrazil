
-- Tabela de sessões persistentes de fluxo (State Machine)
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  contact_phone text NOT NULL,
  contact_name text DEFAULT '',
  flow_id uuid REFERENCES public.whatsapp_flows(id) ON DELETE SET NULL,
  funnel_id uuid REFERENCES public.whatsapp_funnels(id) ON DELETE SET NULL,
  current_node_id text,
  variables jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  waiting_for text,
  last_user_input text,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_flow_sessions_status_chk
    CHECK (status IN ('active','waiting_input','completed','aborted','expired','error'))
);

CREATE INDEX IF NOT EXISTS idx_wfs_active_contact
  ON public.whatsapp_flow_sessions (instance_id, contact_phone)
  WHERE status IN ('active','waiting_input');

CREATE INDEX IF NOT EXISTS idx_wfs_tenant_status
  ON public.whatsapp_flow_sessions (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_wfs_expires
  ON public.whatsapp_flow_sessions (expires_at)
  WHERE status = 'waiting_input';

CREATE INDEX IF NOT EXISTS idx_wfs_active_pending
  ON public.whatsapp_flow_sessions (tenant_id, last_event_at)
  WHERE status = 'active';

-- updated_at trigger
DROP TRIGGER IF EXISTS update_wfs_updated_at ON public.whatsapp_flow_sessions;
CREATE TRIGGER update_wfs_updated_at
  BEFORE UPDATE ON public.whatsapp_flow_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ensure_tenant_id trigger
DROP TRIGGER IF EXISTS ensure_tenant_id_wfs ON public.whatsapp_flow_sessions;
CREATE TRIGGER ensure_tenant_id_wfs
  BEFORE INSERT ON public.whatsapp_flow_sessions
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();

-- RLS
ALTER TABLE public.whatsapp_flow_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant staff manage flow sessions" ON public.whatsapp_flow_sessions;
CREATE POLICY "Tenant staff manage flow sessions"
ON public.whatsapp_flow_sessions
FOR ALL
TO authenticated
USING (public.is_tenant_staff(tenant_id))
WITH CHECK (public.is_tenant_staff(tenant_id));

DROP POLICY IF EXISTS "Super admin sees all flow sessions" ON public.whatsapp_flow_sessions;
CREATE POLICY "Super admin sees all flow sessions"
ON public.whatsapp_flow_sessions
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Claim atômico de sessões prontas para processar
CREATE OR REPLACE FUNCTION public.claim_flow_sessions(
  _worker_id uuid,
  _batch_size int DEFAULT 20
)
RETURNS SETOF public.whatsapp_flow_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.whatsapp_flow_sessions s
  SET last_event_at = now()
  WHERE s.id IN (
    SELECT id FROM public.whatsapp_flow_sessions
    WHERE status = 'active'
    ORDER BY last_event_at ASC
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING s.*;
END;
$$;

-- Expira sessões waiting_input com expires_at vencido
CREATE OR REPLACE FUNCTION public.expire_flow_sessions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  UPDATE public.whatsapp_flow_sessions
  SET status = 'expired'
  WHERE status = 'waiting_input'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- Recebe input do usuário e reativa a sessão para o engine processar
CREATE OR REPLACE FUNCTION public.advance_flow_session_with_input(
  _instance_id uuid,
  _contact_phone text,
  _user_input text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_id uuid;
BEGIN
  UPDATE public.whatsapp_flow_sessions
  SET status = 'active',
      last_user_input = _user_input,
      variables = variables || jsonb_build_object('last_input', _user_input),
      last_event_at = now()
  WHERE instance_id = _instance_id
    AND contact_phone = _contact_phone
    AND status = 'waiting_input'
  RETURNING id INTO _session_id;

  RETURN _session_id;
END;
$$;
