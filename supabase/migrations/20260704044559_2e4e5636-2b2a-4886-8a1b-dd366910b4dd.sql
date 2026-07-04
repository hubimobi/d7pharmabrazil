
DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public
WITH (security_invoker = true) AS
SELECT id, name, slug, short_description, description, price, original_price,
       image_url, extra_images, benefits, rating, reviews_count, badge, stock,
       active, weight, height, width, length, manufacturer, unit, featured,
       show_countdown, countdown_mode, countdown_end_time, countdown_end_date,
       countdown_duration_minutes, group_name, seo_title, seo_description,
       seo_keywords, upsell_product_ids, tenant_id, created_at, updated_at
FROM public.products
WHERE active = true;

GRANT SELECT ON public.products_public TO anon, authenticated;

REVOKE SELECT (sku, ncm, gtin, cost_price) ON public.products FROM anon;

DROP POLICY IF EXISTS tenant_storage_public ON storage.objects;
CREATE POLICY tenant_storage_public ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = ANY (ARRAY['product-images','store-assets','images'])
  AND (storage.foldername(name))[1] = 'tenants'
);
