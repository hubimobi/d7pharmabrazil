
ALTER TABLE public.whatsapp_funnel_steps
  ADD COLUMN IF NOT EXISTS step_type text NOT NULL DEFAULT 'message_template',
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS label text DEFAULT '';
