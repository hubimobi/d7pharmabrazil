
-- Drop the overly permissive public SELECT policy on doctors
DROP POLICY IF EXISTS "Public can view active doctors via view" ON public.doctors;
DROP POLICY IF EXISTS "Anyone can view active doctors" ON public.doctors;

-- Create a restrictive policy: anonymous users get NO direct access to doctors table
-- They must use the doctors_public view which only exposes safe columns
CREATE POLICY "Anon denied direct doctors access"
  ON public.doctors FOR SELECT
  TO anon
  USING (false);
