ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_position text DEFAULT 'right',
  ADD COLUMN IF NOT EXISTS whatsapp_delay_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_show_on_scroll boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS webchat_position text DEFAULT 'right',
  ADD COLUMN IF NOT EXISTS webchat_delay_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webchat_show_on_scroll boolean DEFAULT false;