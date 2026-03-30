
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.products.cost_price IS 'Valor de custo do produto para cálculo de margem';

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS goal_monthly_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal_conversion_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal_cart_recovery numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal_upsell numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal_ltv numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal_profit_margin numeric DEFAULT 30;

COMMENT ON COLUMN public.store_settings.goal_profit_margin IS 'Meta de margem de lucro em % para produtos';
