
-- Short links table
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  target_url text NOT NULL,
  utm_source text DEFAULT '',
  utm_medium text DEFAULT '',
  utm_campaign text DEFAULT '',
  clicks_count integer NOT NULL DEFAULT 0,
  conversions_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Link clicks table
CREATE TABLE public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  device_type text DEFAULT 'desktop',
  referrer text DEFAULT '',
  clicked_at timestamptz NOT NULL DEFAULT now()
);

-- Link conversions table
CREATE TABLE public.link_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_total numeric NOT NULL DEFAULT 0,
  converted_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_conversions ENABLE ROW LEVEL SECURITY;

-- Admins can manage short_links
CREATE POLICY "Admins can manage short_links" ON public.short_links FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Anyone can read active short_links (for redirect)
CREATE POLICY "Anyone can read active short_links" ON public.short_links FOR SELECT TO anon, authenticated USING (active = true);

-- Admins can manage link_clicks
CREATE POLICY "Admins can manage link_clicks" ON public.link_clicks FOR ALL TO authenticated USING (public.is_admin());

-- Anyone can insert clicks (tracking)
CREATE POLICY "Anyone can insert clicks" ON public.link_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admins can manage link_conversions
CREATE POLICY "Admins can manage link_conversions" ON public.link_conversions FOR ALL TO authenticated USING (public.is_admin());

-- Anyone can insert conversions (from checkout)
CREATE POLICY "Anyone can insert conversions" ON public.link_conversions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Function to increment clicks atomically
CREATE OR REPLACE FUNCTION public.increment_link_clicks(link_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.short_links SET clicks_count = clicks_count + 1 WHERE id = link_id;
$$;

-- Function to increment conversions atomically
CREATE OR REPLACE FUNCTION public.increment_link_conversions(link_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.short_links SET conversions_count = conversions_count + 1 WHERE id = link_id;
$$;
