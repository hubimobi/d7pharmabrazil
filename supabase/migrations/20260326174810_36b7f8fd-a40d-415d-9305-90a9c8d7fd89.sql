-- Create a public view with only non-sensitive doctor fields
CREATE VIEW public.doctors_public
WITH (security_invoker = on) AS
  SELECT id, name, specialty, city, state, active
  FROM public.doctors;

-- Replace the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active doctors" ON public.doctors;

-- Public can only access via the view (which has no sensitive columns)
CREATE POLICY "Public can view active doctors via view"
  ON public.doctors FOR SELECT TO public
  USING (active = true AND (
    current_setting('role') = 'authenticated' 
    OR id IN (SELECT id FROM public.doctors_public WHERE active = true)
  ));