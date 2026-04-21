-- Migration: 20260421023800_whatsapp_schedule_activation.sql
-- Description: Ativação do agendamento automático via pg_cron para o disparo em massa

-- 1. Habilitar pg_cron (se não estiver habilitado)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Agendar o processador de fila para rodar a cada 1 minuto
-- Nota: O processador já respeita horários comerciais e limites globais.
SELECT cron.schedule(
  'whatsapp-process-queue-job',
  '* * * * *', -- Cada minuto
  $$
  SELECT net.http_post(
    url := (SELECT value FROM public.store_settings WHERE key = 'supabase_url' LIMIT 1) || '/functions/v1/whatsapp-process-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM public.store_settings WHERE key = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'
  );
  $$
);

-- 3. Garantir que o limite global comporte os disparos de amanhã (700 mensagens)
-- O limite global padrão agora é 1000, mas vamos garantir na config do tenant
UPDATE public.tenants SET whatsapp_settings = whatsapp_settings || '{"daily_global_limit": 1000}'::jsonb;
