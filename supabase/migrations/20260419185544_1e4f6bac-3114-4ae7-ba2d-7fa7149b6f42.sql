-- Fase 1: Atomicidade e idempotência da fila WhatsApp
ALTER TABLE public.whatsapp_message_queue
  ADD COLUMN IF NOT EXISTS claimed_by uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_queue_idempotency
  ON public.whatsapp_message_queue (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_claimed
  ON public.whatsapp_message_queue (status, claimed_at)
  WHERE status = 'processing';

-- Função de claim atômico: pega N mensagens 'pending' já vencidas e marca 'processing'.
-- Usa FOR UPDATE SKIP LOCKED para evitar que dois workers peguem a mesma linha.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_messages(
  _worker_id uuid,
  _batch_size int DEFAULT 10,
  _tenant_id uuid DEFAULT NULL
)
RETURNS SETOF public.whatsapp_message_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.whatsapp_message_queue q
  SET status = 'processing',
      claimed_by = _worker_id,
      claimed_at = now()
  WHERE q.id IN (
    SELECT id FROM public.whatsapp_message_queue
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND (_tenant_id IS NULL OR tenant_id = _tenant_id)
    ORDER BY priority ASC, scheduled_at ASC
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.*;
END;
$$;

-- Função de rescue: devolve mensagens travadas em 'processing' há mais de 5 min para 'pending'
CREATE OR REPLACE FUNCTION public.rescue_stuck_whatsapp_messages(
  _stuck_minutes int DEFAULT 5
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  UPDATE public.whatsapp_message_queue
  SET status = 'pending',
      claimed_by = NULL,
      claimed_at = NULL,
      retry_count = retry_count + 1,
      error_message = COALESCE(error_message, '') || ' [rescued from stuck processing]'
  WHERE status = 'processing'
    AND claimed_at < now() - (_stuck_minutes || ' minutes')::interval
    AND retry_count < max_retries;

  GET DIAGNOSTICS _count = ROW_COUNT;

  -- Os que esgotaram retry vão para failed
  UPDATE public.whatsapp_message_queue
  SET status = 'failed',
      error_message = COALESCE(error_message, '') || ' [stuck >'|| _stuck_minutes ||'min, max retries reached]'
  WHERE status = 'processing'
    AND claimed_at < now() - (_stuck_minutes || ' minutes')::interval
    AND retry_count >= max_retries;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_messages(uuid, int, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rescue_stuck_whatsapp_messages(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_messages(uuid, int, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rescue_stuck_whatsapp_messages(int) TO service_role;