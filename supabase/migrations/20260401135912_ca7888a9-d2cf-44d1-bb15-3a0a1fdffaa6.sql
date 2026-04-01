
DROP VIEW IF EXISTS public.representatives_public;

CREATE OR REPLACE FUNCTION public.get_active_representatives_public()
RETURNS TABLE(id uuid, name text, short_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.short_code
  FROM public.representatives r
  WHERE r.active = true
  ORDER BY r.name;
$$;
