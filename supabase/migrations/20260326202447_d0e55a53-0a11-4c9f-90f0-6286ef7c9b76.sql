CREATE TABLE public.static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view static pages" ON public.static_pages FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage static pages" ON public.static_pages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.static_pages (slug, title, content) VALUES
  ('politica-de-privacidade', 'Política de Privacidade', ''),
  ('termos-de-uso', 'Termos de Uso', ''),
  ('trocas-e-devolucoes', 'Trocas e Devoluções', ''),
  ('quem-somos', 'Quem Somos', '');