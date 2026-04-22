-- Flow engine improvements: fixed RPC, timeout column, campaign_id, versioning, re-entry policy

-- 1. Fix advance_flow_session_with_input: use contact_phone + tenant_id (not instance_id)
--    so re-triggered sessions work correctly when instance rotation occurs.
CREATE OR REPLACE FUNCTION public.advance_flow_session_with_input(
  _contact_phone text,
  _tenant_id uuid,
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
  WHERE contact_phone = _contact_phone
    AND tenant_id = _tenant_id
    AND status = 'waiting_input'
  RETURNING id INTO _session_id;

  RETURN _session_id;
END;
$$;

-- Keep old signature as a shim so existing callers don't break during rollout
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

-- 2. timeout_node_id on wait_input nodes: stored in node.data but we keep this column
--    on the session so the tick knows where to route on expiry.
ALTER TABLE public.whatsapp_flow_sessions
  ADD COLUMN IF NOT EXISTS timeout_node_id text;

-- 3. campaign_id link so flows launched by campaigns can be traced
ALTER TABLE public.whatsapp_flow_sessions
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flow_sessions_campaign_id
  ON public.whatsapp_flow_sessions(campaign_id);

-- 4. re_entry_policy on whatsapp_flows: 'allow' | 'block' | 'restart'
ALTER TABLE public.whatsapp_flows
  ADD COLUMN IF NOT EXISTS reentry_policy text NOT NULL DEFAULT 'allow'
  CHECK (reentry_policy IN ('allow', 'block', 'restart'));

-- 5. Flow versioning: snapshot nodes/edges on every save
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_versions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id     uuid        NOT NULL REFERENCES public.whatsapp_flows(id) ON DELETE CASCADE,
  version     integer     NOT NULL,
  nodes       jsonb       NOT NULL DEFAULT '[]',
  edges       jsonb       NOT NULL DEFAULT '[]',
  saved_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_versions_flow_id
  ON public.whatsapp_flow_versions(flow_id, version DESC);

-- Trigger: auto-snapshot on nodes/edges change
CREATE OR REPLACE FUNCTION public.snapshot_flow_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_version integer;
BEGIN
  IF (OLD.nodes IS DISTINCT FROM NEW.nodes) OR (OLD.edges IS DISTINCT FROM NEW.edges) THEN
    SELECT COALESCE(MAX(version), 0) + 1
      INTO _next_version
      FROM public.whatsapp_flow_versions
     WHERE flow_id = NEW.id;

    INSERT INTO public.whatsapp_flow_versions(flow_id, version, nodes, edges)
    VALUES (NEW.id, _next_version, NEW.nodes, NEW.edges);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_flow_version ON public.whatsapp_flows;
CREATE TRIGGER trg_snapshot_flow_version
  AFTER UPDATE ON public.whatsapp_flows
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_flow_version();

-- 6. converted / converted_at columns on whatsapp_contacts (used by action "mark_converted")
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS converted boolean NOT NULL DEFAULT false;
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
