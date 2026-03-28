
-- Create a public view with only the columns needed for redirect
CREATE OR REPLACE VIEW public.short_links_public AS
  SELECT id, code, target_url, doctor_id, active
  FROM public.short_links
  WHERE active = true;

-- Grant access to anon/authenticated
GRANT SELECT ON public.short_links_public TO anon, authenticated;

-- Drop the overly permissive policy
DROP POLICY "Anyone can read active short_links" ON public.short_links;
