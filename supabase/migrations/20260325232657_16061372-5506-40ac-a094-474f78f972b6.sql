ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_button_name text DEFAULT 'Especialista D7 Pharma',
  ADD COLUMN IF NOT EXISTS whatsapp_button_message text DEFAULT 'Olá! Gostaria de falar com um especialista.';