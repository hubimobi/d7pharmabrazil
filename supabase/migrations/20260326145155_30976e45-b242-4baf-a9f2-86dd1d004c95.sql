CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view integration logs"
  ON public.integration_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Service role can insert logs"
  ON public.integration_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX idx_integration_logs_created ON public.integration_logs (created_at DESC);
CREATE INDEX idx_integration_logs_integration ON public.integration_logs (integration);