
-- Add new fields to doctors table for prescriber portal
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS pix text,
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add unique constraint on doctors email
CREATE UNIQUE INDEX IF NOT EXISTS doctors_email_unique ON public.doctors(email) WHERE email IS NOT NULL;

-- Add unique constraint on doctors user_id  
CREATE UNIQUE INDEX IF NOT EXISTS doctors_user_id_unique ON public.doctors(user_id) WHERE user_id IS NOT NULL;

-- Update commission default rate to 20
ALTER TABLE public.commissions ALTER COLUMN commission_rate SET DEFAULT 20;

-- Add RLS policy for prescribers to view their own commissions
CREATE POLICY "Prescribers can view own commissions"
ON public.commissions
FOR SELECT
TO authenticated
USING (
  doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Add RLS policy for doctors to view themselves by user_id
CREATE POLICY "Prescribers can view own doctor record"
ON public.doctors
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add 'prescriber' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'prescriber';

-- Function to get doctor_id for current prescriber user
CREATE OR REPLACE FUNCTION public.get_doctor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1
$$;
