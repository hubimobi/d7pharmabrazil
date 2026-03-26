CREATE TABLE public.tiktok_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  shop_id text,
  shop_name text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tiktok_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tiktok_tokens"
  ON public.tiktok_tokens
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_tiktok_tokens_updated_at
  BEFORE UPDATE ON public.tiktok_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();