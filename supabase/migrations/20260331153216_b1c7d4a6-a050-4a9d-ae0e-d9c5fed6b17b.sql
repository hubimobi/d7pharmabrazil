
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Update existing doctors to approved
UPDATE public.doctors SET approval_status = 'approved' WHERE approval_status = 'approved';

-- Allow anonymous users to insert doctors (for self-registration)
CREATE POLICY "Anyone can self-register as doctor" ON public.doctors
  FOR INSERT TO anon WITH CHECK (
    approval_status = 'pending' AND name IS NOT NULL AND name != ''
  );
