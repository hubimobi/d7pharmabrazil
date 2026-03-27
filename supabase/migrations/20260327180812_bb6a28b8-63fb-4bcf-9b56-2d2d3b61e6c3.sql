ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS checkout_show_testimonials boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_show_urgency boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_show_combo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_show_recommendations boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_show_motivation boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_show_free_shipping_bar boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS gtm_id text DEFAULT '';