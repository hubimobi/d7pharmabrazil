ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS design_title_color text DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS design_text_color text DEFAULT '#374151',
  ADD COLUMN IF NOT EXISTS design_icon_color text DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS design_font text DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS design_footer_color text DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS design_bg_color text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS design_icon_style text DEFAULT 'rounded';