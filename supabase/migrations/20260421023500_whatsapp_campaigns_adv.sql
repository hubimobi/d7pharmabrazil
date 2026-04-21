-- Migration: 20260421023500_whatsapp_campaigns_adv.sql
-- Description: Extensão da tabela de campanhas e configurações de tenant para orquestração avançada

-- 1. Configurações de WhatsApp no Tenant
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_settings jsonb DEFAULT '{
  "timezone": "America/Sao_Paulo",
  "default_working_hours": {"start": "08:00", "end": "18:00"},
  "default_working_days": [1, 2, 3, 4, 5]
}';

-- 2. Colunas Avançadas em whatsapp_campaigns
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS instance_ids uuid[] DEFAULT NULL;
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS working_hours jsonb DEFAULT '{"start": "08:00", "end": "18:00"}';
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS working_days integer[] DEFAULT '{1, 2, 3, 4, 5}'; -- Seg a Sex
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS consecutive_errors_count integer DEFAULT 0;
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS auto_pause_threshold integer DEFAULT 10;
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS delivered_count integer DEFAULT 0;
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS read_count integer DEFAULT 0;
ALTER TABLE public.whatsapp_campaigns ADD COLUMN IF NOT EXISTS error_reason text;

-- 3. Atualizar função de estatísticas para suportar Delivered/Read via Log
CREATE OR REPLACE FUNCTION public.fn_update_whatsapp_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.campaign_id IS NOT NULL) THEN
    -- Contador de ENVIADAS (pela fila)
    IF (NEW.status = 'sent' AND OLD.status != 'sent') THEN
      UPDATE public.whatsapp_campaigns
      SET sent_count = sent_count + 1,
          consecutive_errors_count = 0, -- Reset de erros ao ter sucesso
          updated_at = now()
      WHERE id = NEW.campaign_id;
    
    -- Contador de ERROS (pela fila)
    ELSIF (NEW.status = 'error' AND OLD.status != 'error') THEN
      UPDATE public.whatsapp_campaigns
      SET failed_count = failed_count + 1,
          consecutive_errors_count = consecutive_errors_count + 1,
          updated_at = now()
      WHERE id = NEW.campaign_id;
      
      -- Auto-pause se atingir limite de erros consecutivos
      UPDATE public.whatsapp_campaigns
      SET status = 'paused',
          error_reason = 'Auto-pausa: Limite de erros consecutivos atingido.'
      WHERE id = NEW.campaign_id AND consecutive_errors_count >= auto_pause_threshold AND status = 'running';

    -- Contadores de Webhook (status dinâmico do log)
    ELSIF (NEW.status = 'delivered' AND OLD.status != 'delivered') THEN
      UPDATE public.whatsapp_campaigns SET delivered_count = delivered_count + 1 WHERE id = NEW.campaign_id;
    ELSIF (NEW.status = 'read' AND OLD.status != 'read') THEN
      UPDATE public.whatsapp_campaigns SET read_count = read_count + 1 WHERE id = NEW.campaign_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger para capturar updates de status (webhook)
DROP TRIGGER IF EXISTS tr_update_campaign_stats ON public.whatsapp_message_log;
CREATE TRIGGER tr_update_campaign_stats
  AFTER INSERT OR UPDATE ON public.whatsapp_message_log
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_whatsapp_campaign_stats();
