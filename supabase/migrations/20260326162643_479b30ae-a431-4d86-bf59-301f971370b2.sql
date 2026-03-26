
ALTER TABLE public.store_settings
  ADD COLUMN combo_offer_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN combo_offer_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN combo_offer_discount numeric NOT NULL DEFAULT 17,
  ADD COLUMN combo_offer_free_shipping boolean NOT NULL DEFAULT true,
  ADD COLUMN combo_offer_label text NOT NULL DEFAULT 'OFERTA EXCLUSIVA PARA VOCÊ'::text;
