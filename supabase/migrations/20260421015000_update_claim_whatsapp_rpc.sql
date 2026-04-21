-- Migration: 20260421015000_update_claim_whatsapp_rpc.sql
-- Description: Update claim_whatsapp_messages to respect campaign status

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
    SELECT q_sub.id 
    FROM public.whatsapp_message_queue q_sub
    LEFT JOIN public.whatsapp_campaigns c ON q_sub.campaign_id = c.id
    WHERE q_sub.status = 'pending'
      AND q_sub.scheduled_at <= now()
      AND (_tenant_id IS NULL OR q_sub.tenant_id = _tenant_id)
      -- Filtro Crítico: Se houver campanha, ela deve estar 'running'
      AND (q_sub.campaign_id IS NULL OR c.status = 'running')
    ORDER BY q_sub.priority ASC, q_sub.scheduled_at ASC
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.*;
END;
$$;
