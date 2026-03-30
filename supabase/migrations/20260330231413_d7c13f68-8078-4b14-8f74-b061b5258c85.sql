
ALTER TABLE public.product_testimonials 
  ADD COLUMN IF NOT EXISTS author_image_url text,
  ADD COLUMN IF NOT EXISTS product_image_url text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.store_settings 
  ADD COLUMN IF NOT EXISTS feedback_bonus_coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;
