-- Update section_order default and existing records to include new sections
UPDATE public.store_settings
SET section_order = '["section_highlight_banner","section_flash_sale","section_hero_visible","section_featured_visible","section_promo_banners_visible","section_products_visible","section_benefits_visible","section_testimonials_visible","section_guarantee_visible","section_instagram_visible","section_trust_badges_visible","section_mailing_visible"]'::jsonb
WHERE section_order IS NULL 
   OR NOT (section_order::text LIKE '%section_highlight_banner%');

ALTER TABLE public.store_settings 
ALTER COLUMN section_order SET DEFAULT '["section_highlight_banner","section_flash_sale","section_hero_visible","section_featured_visible","section_promo_banners_visible","section_products_visible","section_benefits_visible","section_testimonials_visible","section_guarantee_visible","section_instagram_visible","section_trust_badges_visible","section_mailing_visible"]'::jsonb;