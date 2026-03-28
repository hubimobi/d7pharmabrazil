ALTER TABLE public.store_settings 
  ADD COLUMN IF NOT EXISTS mailing_bg_color TEXT DEFAULT '#1a365d',
  ADD COLUMN IF NOT EXISTS mailing_button_color TEXT DEFAULT '#e53e3e',
  ADD COLUMN IF NOT EXISTS mailing_title_color TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS mailing_text_color TEXT DEFAULT '#ffffffcc';