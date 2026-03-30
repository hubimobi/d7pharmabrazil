ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS display_name text DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS attendant_name text DEFAULT '';