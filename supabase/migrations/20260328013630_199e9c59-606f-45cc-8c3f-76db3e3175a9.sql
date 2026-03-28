
CREATE TABLE public.promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT 'Conferir',
  button_link TEXT NOT NULL DEFAULT '/produtos',
  image_url TEXT,
  bg_color TEXT DEFAULT '#ffffff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read promo_banners" ON public.promo_banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage promo_banners" ON public.promo_banners FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.promo_banners (slot, title, subtitle, button_text, button_link) VALUES
(1, 'COMPRE AGORA COM ATÉ 20% OFF', 'LINHA DE CRÉDITO', 'Conferir', '/produtos'),
(2, 'COMPRE AGORA COM TAXA REDUZIDA', 'LINHA DE CRÉDITO', 'Conferir', '/produtos');
