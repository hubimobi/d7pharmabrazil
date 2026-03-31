
ALTER TABLE public.product_testimonials 
ADD COLUMN IF NOT EXISTS product_image_urls jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single product_image_url to the new array column
UPDATE public.product_testimonials 
SET product_image_urls = jsonb_build_array(product_image_url)
WHERE product_image_url IS NOT NULL AND product_image_url != '' AND (product_image_urls IS NULL OR product_image_urls = '[]'::jsonb);
