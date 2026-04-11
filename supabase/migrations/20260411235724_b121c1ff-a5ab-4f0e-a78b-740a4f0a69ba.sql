ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS evolution_api_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS evolution_api_key text DEFAULT '';