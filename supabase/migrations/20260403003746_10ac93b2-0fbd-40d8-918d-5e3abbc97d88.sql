CREATE TABLE public.campaign_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_template TEXT NOT NULL DEFAULT '{produto} — {modelo}',
  adset_template TEXT NOT NULL DEFAULT '{perfil} | {funil} | {plataforma}',
  ad_template TEXT NOT NULL DEFAULT '{perfil}_{plataforma}_{variacao}',
  default_objective TEXT NOT NULL DEFAULT 'CONVERSIONS',
  audience_template TEXT NOT NULL DEFAULT '{perfil} — {funil} — {plataforma}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaign_config"
ON public.campaign_config
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','suporte','gestor']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','suporte','gestor']::app_role[]));

CREATE TRIGGER update_campaign_config_updated_at
BEFORE UPDATE ON public.campaign_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.campaign_config (campaign_template, adset_template, ad_template, default_objective, audience_template, notes)
VALUES (
  '{produto} — {modelo}',
  '{perfil} | {funil} | {plataforma}',
  '{perfil}_{plataforma}_{variacao}',
  'CONVERSIONS',
  '{perfil} — {funil} — {plataforma}',
  'Padrão de nomenclatura para campanhas Meta Ads e Google Ads. Use as variáveis entre chaves para personalizar.'
);