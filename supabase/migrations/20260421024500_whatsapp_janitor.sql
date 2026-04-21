-- Migration: 20260421024500_whatsapp_janitor.sql
-- Description: Robô de limpeza (Janitor) para recuperar mensagens presas em 'processing'

-- 1. Agendar limpeza a cada 15 minutos
-- Note: Se uma Edge Function morrer (timeout), a linha fica como 'processing'.
-- Este job devolve para 'pending' mensagens que estão paradas há mais de 20 minutos.
SELECT cron.schedule(
  'whatsapp-janitor-job',
  '*/15 * * * *', -- A cada 15 minutos
  $$
  UPDATE public.whatsapp_message_queue
  SET status = 'pending',
      claimed_by = NULL,
      claimed_at = NULL,
      error_message = 'Recuperado por Time-out (Janitor)'
  WHERE status = 'processing'
    AND claimed_at < (now() - interval '20 minutes');
  $$
);

-- 2. Garantir índices de performance para busca por status
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_recovery 
ON public.whatsapp_message_queue(status, claimed_at) 
WHERE status = 'processing';
