ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS countdown_mode text NOT NULL DEFAULT 'end_of_day',
ADD COLUMN IF NOT EXISTS countdown_end_time text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS countdown_end_date timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS countdown_duration_minutes integer DEFAULT 60;

COMMENT ON COLUMN public.products.countdown_mode IS 'end_of_day | daily_until | specific_datetime | after_access';
COMMENT ON COLUMN public.products.countdown_end_time IS 'HH:MM format for daily_until mode';
COMMENT ON COLUMN public.products.countdown_end_date IS 'Specific datetime for specific_datetime mode';
COMMENT ON COLUMN public.products.countdown_duration_minutes IS 'Minutes for after_access mode';