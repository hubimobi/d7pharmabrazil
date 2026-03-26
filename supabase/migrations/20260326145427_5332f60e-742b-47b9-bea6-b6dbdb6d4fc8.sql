CREATE TABLE public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  button_text text NOT NULL DEFAULT 'Comprar Agora',
  button_link text NOT NULL DEFAULT '/produtos',
  button2_text text NOT NULL DEFAULT '',
  button2_link text NOT NULL DEFAULT '',
  btn1_bg_color text,
  btn1_hover_color text,
  btn2_bg_color text,
  btn2_hover_color text,
  media_type text NOT NULL DEFAULT 'image',
  image_url text,
  video_url text,
  side_image_url text,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
  ON public.hero_banners FOR SELECT USING (true);

CREATE POLICY "Admins can manage banners"
  ON public.hero_banners FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Add carousel settings to store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS hero_carousel_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hero_carousel_effect text NOT NULL DEFAULT 'fade',
  ADD COLUMN IF NOT EXISTS hero_carousel_interval integer NOT NULL DEFAULT 5;

-- Migrate existing banner data to hero_banners table
INSERT INTO public.hero_banners (sort_order, active, title, subtitle, button_text, button_link, button2_text, button2_link, btn1_bg_color, btn1_hover_color, btn2_bg_color, btn2_hover_color, media_type, image_url, video_url, badges)
SELECT 0, true,
  COALESCE(hero_title, ''),
  COALESCE(hero_subtitle, ''),
  COALESCE(hero_button_text, 'Comprar Agora'),
  COALESCE(hero_button_link, '/produtos'),
  COALESCE(hero_button2_text, ''),
  COALESCE(hero_button2_link, ''),
  hero_btn1_bg_color, hero_btn1_hover_color,
  hero_btn2_bg_color, hero_btn2_hover_color,
  COALESCE(hero_media_type, 'image'),
  hero_image_url, hero_video_url,
  COALESCE(hero_badges, '[]'::jsonb)
FROM public.store_settings LIMIT 1;