
-- Add short_code column to representatives
ALTER TABLE public.representatives ADD COLUMN IF NOT EXISTS short_code text;

-- Generate short codes for existing representatives (4 uppercase alphanumeric chars)
UPDATE public.representatives
SET short_code = upper(substr(md5(id::text || created_at::text), 1, 4))
WHERE short_code IS NULL;

-- Make it unique and not null
ALTER TABLE public.representatives ALTER COLUMN short_code SET NOT NULL;
ALTER TABLE public.representatives ADD CONSTRAINT representatives_short_code_unique UNIQUE (short_code);

-- Create a function to auto-generate short_code on insert
CREATE OR REPLACE FUNCTION public.generate_rep_short_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _code text;
  _exists boolean;
BEGIN
  IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
    LOOP
      _code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
      SELECT EXISTS(SELECT 1 FROM public.representatives WHERE short_code = _code) INTO _exists;
      EXIT WHEN NOT _exists;
    END LOOP;
    NEW.short_code := _code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rep_short_code
BEFORE INSERT ON public.representatives
FOR EACH ROW
EXECUTE FUNCTION public.generate_rep_short_code();
