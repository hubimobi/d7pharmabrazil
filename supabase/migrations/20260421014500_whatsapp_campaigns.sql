-- Migration: 20260421014500_whatsapp_campaigns.sql
-- Description: Create whatsapp_campaigns table and link it to queue/log

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft, scheduled, running, paused, completed, cancelled
  flow_id uuid REFERENCES public.whatsapp_flows(id) ON DELETE SET NULL,
  funnel_id uuid REFERENCES public.whatsapp_funnels(id) ON DELETE SET NULL,
  total_contacts integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own tenant campaigns"
  ON public.whatsapp_campaigns FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own tenant campaigns"
  ON public.whatsapp_campaigns FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own tenant campaigns"
  ON public.whatsapp_campaigns FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Adicionar campaign_id às tabelas de fila e log
ALTER TABLE public.whatsapp_message_queue ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.whatsapp_message_log ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL;

-- Trigger para atualizar contadores da campanha automaticamente
CREATE OR REPLACE FUNCTION public.fn_update_whatsapp_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.campaign_id IS NOT NULL) THEN
    IF (NEW.status = 'sent') THEN
      UPDATE public.whatsapp_campaigns
      SET sent_count = sent_count + 1,
          updated_at = now()
      WHERE id = NEW.campaign_id;
    ELSIF (NEW.status = 'error') THEN
      UPDATE public.whatsapp_campaigns
      SET failed_count = failed_count + 1,
          updated_at = now()
      WHERE id = NEW.campaign_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_campaign_stats
  AFTER INSERT ON public.whatsapp_message_log
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_whatsapp_campaign_stats();
