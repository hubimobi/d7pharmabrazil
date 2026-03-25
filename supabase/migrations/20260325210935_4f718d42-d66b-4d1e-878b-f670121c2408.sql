-- Add Bling-compatible fields + shipping dimensions to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS height numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS width numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS length numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS group_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS manufacturer text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sku text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ncm text DEFAULT '',
  ADD COLUMN IF NOT EXISTS gtin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS extra_images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create testimonials table
CREATE TABLE IF NOT EXISTS public.product_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage testimonials" ON public.product_testimonials
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can view testimonials" ON public.product_testimonials
  FOR SELECT TO public USING (true);