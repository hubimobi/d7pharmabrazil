ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS seo_default_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_default_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_default_og_image text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_keywords text DEFAULT '';