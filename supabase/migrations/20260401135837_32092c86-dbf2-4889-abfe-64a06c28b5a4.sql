
-- Create a public view for representatives (only id, name, short_code for the signup page)
CREATE OR REPLACE VIEW public.representatives_public AS
SELECT id, name, short_code
FROM public.representatives
WHERE active = true;

-- Grant anonymous access to this view
GRANT SELECT ON public.representatives_public TO anon;
GRANT SELECT ON public.representatives_public TO authenticated;
