ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '';