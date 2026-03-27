ALTER TABLE public.representatives ADD COLUMN IF NOT EXISTS pix text DEFAULT '';

ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS payment_id text DEFAULT '';
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone DEFAULT NULL;