CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'D7 Pharma Brazil',
  cnpj text DEFAULT '',
  email text DEFAULT '',
  whatsapp text DEFAULT '',
  address_street text DEFAULT '',
  address_number text DEFAULT '',
  address_complement text DEFAULT '',
  address_neighborhood text DEFAULT '',
  address_city text DEFAULT '',
  address_state text DEFAULT '',
  address_cep text DEFAULT '',
  instagram text DEFAULT '',
  facebook text DEFAULT '',
  tiktok text DEFAULT '',
  youtube text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store settings" ON public.store_settings FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Anyone can view store settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.store_settings (store_name, email, whatsapp, address_city, address_state)
VALUES ('D7 Pharma Brazil', 'contato@d7pharma.com.br', '(11) 99999-9999', 'São Paulo', 'SP');