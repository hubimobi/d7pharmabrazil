ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS webchat_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webchat_script text DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_button_enabled boolean NOT NULL DEFAULT true;