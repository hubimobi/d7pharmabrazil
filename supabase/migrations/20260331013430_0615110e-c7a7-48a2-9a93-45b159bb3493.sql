
-- RLS policy: Representatives can view coupons linked to them or their doctors
CREATE POLICY "Reps can view own coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  representative_id = get_representative_id()
  OR doctor_id IN (
    SELECT id FROM public.doctors WHERE representative_id = get_representative_id()
  )
);
