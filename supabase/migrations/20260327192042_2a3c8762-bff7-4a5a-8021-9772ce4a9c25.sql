
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS design_nav_color TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS design_bg_gradient TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS design_footer_gradient TEXT DEFAULT '';
