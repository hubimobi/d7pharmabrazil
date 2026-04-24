-- CRM fields for whatsapp_contacts: ad/utm tracking and first campaign link
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS ad_source text;         -- "Google Ads", "Instagram", "Orgânico", etc.

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS first_campaign_id uuid
  REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.whatsapp_contacts.ad_source IS
  'Origin ad/channel of the lead (e.g. Google Ads, Instagram, Organic)';

COMMENT ON COLUMN public.whatsapp_contacts.first_campaign_id IS
  'First campaign that triggered this contact';
