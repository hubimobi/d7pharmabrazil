-- Migration: Fix advance_flow_session_with_input to handle NULL tenant_id
-- When tenantId is not known, fall back to finding any waiting session for the phone

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
  IF _tenant_id IS NOT NULL THEN
    -- Fast path: tenant scoped lookup
    UPDATE public.whatsapp_flow_sessions
    SET status = 'active',
        last_user_input = _user_input,
        variables = variables || jsonb_build_object('last_input', _user_input),
        last_event_at = now()
    WHERE contact_phone = _contact_phone
      AND tenant_id = _tenant_id
      AND status = 'waiting_input'
    ORDER BY last_event_at DESC
    LIMIT 1
    RETURNING id INTO _session_id;
  ELSE
    -- Fallback: no tenant_id (webhook couldn't resolve it), match by phone only
    UPDATE public.whatsapp_flow_sessions
    SET status = 'active',
        last_user_input = _user_input,
        variables = variables || jsonb_build_object('last_input', _user_input),
        last_event_at = now()
    WHERE id = (
      SELECT id FROM public.whatsapp_flow_sessions
      WHERE contact_phone = _contact_phone
        AND status = 'waiting_input'
      ORDER BY last_event_at DESC
      LIMIT 1
    )
    RETURNING id INTO _session_id;
  END IF;

  RETURN _session_id;
END;
$$;

-- Also ensure instance_id is resolved on flow sessions when it was null at creation
-- This helps the flow engine pick the right WhatsApp number to send from
CREATE OR REPLACE FUNCTION public.resolve_flow_session_instance(
  _session_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _instance_id uuid;
  _tenant_id uuid;
BEGIN
  SELECT tenant_id INTO _tenant_id
  FROM public.whatsapp_flow_sessions
  WHERE id = _session_id AND instance_id IS NULL;

  IF _tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Pick the first connected instance for this tenant
  SELECT id INTO _instance_id
  FROM public.whatsapp_instances
  WHERE tenant_id = _tenant_id
    AND status = 'connected'
    AND active = true
  ORDER BY messages_sent_today ASC
  LIMIT 1;

  IF _instance_id IS NOT NULL THEN
    UPDATE public.whatsapp_flow_sessions
    SET instance_id = _instance_id
    WHERE id = _session_id;
  END IF;

  RETURN _instance_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_flow_session_instance(uuid) TO service_role;
