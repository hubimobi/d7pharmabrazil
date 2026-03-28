-- link_clicks: tighten INSERT
DROP POLICY "Anyone can insert clicks" ON public.link_clicks;
CREATE POLICY "Anyone can insert clicks" ON public.link_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (short_link_id IS NOT NULL);

-- link_conversions: tighten INSERT
DROP POLICY "Anyone can insert conversions" ON public.link_conversions;
CREATE POLICY "Anyone can insert conversions" ON public.link_conversions
  FOR INSERT TO anon, authenticated
  WITH CHECK (short_link_id IS NOT NULL);