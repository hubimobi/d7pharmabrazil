CREATE TABLE public.product_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product FAQs"
  ON public.product_faqs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage product FAQs"
  ON public.product_faqs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));