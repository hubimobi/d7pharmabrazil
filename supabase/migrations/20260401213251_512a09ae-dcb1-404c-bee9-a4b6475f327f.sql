
DROP POLICY "Anyone can self-register as doctor" ON public.doctors;

CREATE POLICY "Anyone can self-register as doctor"
ON public.doctors
FOR INSERT
TO anon
WITH CHECK (
  name IS NOT NULL
  AND name <> ''
  AND (
    (approval_status = 'pending')
    OR (approval_status = 'approved' AND representative_id IS NOT NULL)
  )
);
