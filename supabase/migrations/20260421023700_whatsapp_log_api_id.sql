-- Migration: 20260421023700_whatsapp_log_api_id.sql
-- Description: Adiciona api_id ao log para rastreio de status (Delivered/Read)

ALTER TABLE public.whatsapp_message_log ADD COLUMN IF NOT EXISTS api_id text;
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_api_id ON public.whatsapp_message_log(api_id);

-- Ajustar a função de estatísticas para ser disparada por updates no log (webhook)
-- Já foi feito na migração anterior, mas garantindo que o log capture o campaign_id
ALTER TABLE public.whatsapp_message_log ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL;
