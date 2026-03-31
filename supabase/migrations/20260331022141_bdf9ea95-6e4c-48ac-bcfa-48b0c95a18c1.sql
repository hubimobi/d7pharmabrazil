
-- Add order_id and approved columns to product_testimonials
ALTER TABLE public.product_testimonials 
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Update existing testimonials to be approved (they were already visible)
UPDATE public.product_testimonials SET approved = true WHERE approved = false;

-- Add google_business_place_id to store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS google_business_place_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_business_review_url text DEFAULT '';
