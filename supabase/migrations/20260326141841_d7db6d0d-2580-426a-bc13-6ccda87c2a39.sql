-- Shipping config
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS free_shipping_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_shipping_min_value numeric DEFAULT 499,
  ADD COLUMN IF NOT EXISTS free_shipping_regions text DEFAULT 'all';

-- Notification bar config
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS notification_bar_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_bar_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notification_bar_bg_color text DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS notification_bar_text_color text DEFAULT '#ffffff';

-- Popup banner config
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS popup_banner_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_banner_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS popup_banner_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS popup_banner_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS popup_banner_cta_text text DEFAULT 'Cadastre-se',
  ADD COLUMN IF NOT EXISTS popup_banner_collect_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS popup_banner_delay_seconds integer DEFAULT 5;

-- Table for collected popup emails/leads
CREATE TABLE IF NOT EXISTS public.popup_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text DEFAULT '',
  source text DEFAULT 'popup',
  ghl_synced boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.popup_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage popup leads" ON public.popup_leads FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Anyone can insert popup leads" ON public.popup_leads FOR INSERT TO anon, authenticated WITH CHECK (true);