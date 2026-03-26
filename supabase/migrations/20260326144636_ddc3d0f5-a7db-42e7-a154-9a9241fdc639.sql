
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS representative_id uuid REFERENCES public.representatives(id) ON DELETE SET NULL;
