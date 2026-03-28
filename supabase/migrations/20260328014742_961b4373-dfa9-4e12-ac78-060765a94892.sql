ALTER TABLE public.promo_banners 
  ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'url',
  ADD COLUMN IF NOT EXISTS product_slug TEXT;