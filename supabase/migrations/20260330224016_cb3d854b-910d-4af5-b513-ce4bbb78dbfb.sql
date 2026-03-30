ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS funnel_roles jsonb NOT NULL DEFAULT '["all"]'::jsonb;

COMMENT ON COLUMN public.whatsapp_instances.funnel_roles IS 'Tipos de funil aceitos por esta instância de WhatsApp, ex.: ["all"], ["recuperacao"], ["recompra"], ["upsell"]';