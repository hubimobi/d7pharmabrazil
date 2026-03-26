
-- Add hero video, badges, and button color settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS hero_media_type text DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS hero_video_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_badges jsonb DEFAULT '[{"icon":"Shield","label":"Qualidade Comprovada"},{"icon":"Lock","label":"Compra Segura"},{"icon":"Truck","label":"Entrega Rápida"},{"icon":"Award","label":"Qualidade Premium"}]'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_btn1_bg_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_btn1_hover_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_btn2_bg_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_btn2_hover_color text DEFAULT '';
