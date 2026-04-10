
CREATE TABLE public.visitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  event_name text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  link_ref_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitor events"
  ON public.visitor_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (visitor_id IS NOT NULL AND event_name IS NOT NULL);

CREATE POLICY "Admins can view visitor events"
  ON public.visitor_events FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE INDEX idx_visitor_events_visitor ON public.visitor_events (visitor_id);
CREATE INDEX idx_visitor_events_event ON public.visitor_events (event_name);
CREATE INDEX idx_visitor_events_created ON public.visitor_events (created_at DESC);
CREATE INDEX idx_visitor_events_utm ON public.visitor_events (utm_source, utm_campaign);
