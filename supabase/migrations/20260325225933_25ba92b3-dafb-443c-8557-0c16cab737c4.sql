
CREATE TABLE public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view groups" ON public.product_groups FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage groups" ON public.product_groups FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view manufacturers" ON public.manufacturers FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage manufacturers" ON public.manufacturers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
