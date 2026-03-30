ALTER TABLE public.popup_leads
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS product_name text;

COMMENT ON COLUMN public.popup_leads.tags IS 'Lead tags: frio, morno, quente, produto_vinculado, funil';
COMMENT ON COLUMN public.popup_leads.product_id IS 'Produto vinculado ao lead (fonte de campanha ou lista de compradores)';