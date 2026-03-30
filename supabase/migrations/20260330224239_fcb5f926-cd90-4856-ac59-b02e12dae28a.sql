ALTER TABLE public.whatsapp_funnel_steps
ALTER COLUMN delay_minutes TYPE numeric
USING delay_minutes::numeric;