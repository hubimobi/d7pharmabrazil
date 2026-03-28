ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS visual_theme text NOT NULL DEFAULT 'editorial';