
-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  original_price numeric NOT NULL DEFAULT 0,
  image_url text,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating numeric NOT NULL DEFAULT 5,
  reviews_count integer NOT NULL DEFAULT 0,
  badge text,
  stock integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT TO public USING (active = true);

-- Admins can manage all products
CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL TO authenticated USING (is_admin());

-- Updated at trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies
CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.is_admin());

-- Commissions table
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  representative_id uuid REFERENCES public.representatives(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  order_total numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 10,
  commission_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all commissions" ON public.commissions
  FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Reps can view own commissions" ON public.commissions
  FOR SELECT TO authenticated USING (representative_id = get_representative_id());

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create commission when order is inserted
CREATE OR REPLACE FUNCTION public.create_commission_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rep_id uuid;
  _commission numeric;
BEGIN
  IF NEW.doctor_id IS NOT NULL THEN
    SELECT representative_id INTO _rep_id FROM public.doctors WHERE id = NEW.doctor_id;
    IF _rep_id IS NOT NULL THEN
      _commission := NEW.total * 0.10;
      INSERT INTO public.commissions (order_id, representative_id, doctor_id, order_total, commission_rate, commission_value)
      VALUES (NEW.id, _rep_id, NEW.doctor_id, NEW.total, 10, _commission);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_commission_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION create_commission_for_order();
