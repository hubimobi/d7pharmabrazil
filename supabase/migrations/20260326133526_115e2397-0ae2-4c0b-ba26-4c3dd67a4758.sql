ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asaas_payment_id text;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;