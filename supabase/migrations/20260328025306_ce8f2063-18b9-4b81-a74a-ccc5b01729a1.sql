
ALTER TABLE public.store_settings
  ADD COLUMN section_hero_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_featured_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_benefits_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_products_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_testimonials_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_promo_banners_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_guarantee_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_trust_badges_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_mailing_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN section_instagram_visible boolean NOT NULL DEFAULT true;
