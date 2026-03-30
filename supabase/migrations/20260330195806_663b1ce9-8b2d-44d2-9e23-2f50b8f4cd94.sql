
-- Repurchase funnel table
CREATE TABLE public.repurchase_funnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  customer_email text,
  customer_phone text,
  product_name text NOT NULL DEFAULT '',
  product_id uuid,
  stage text NOT NULL DEFAULT 'compra_feita',
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  feedback_sent_at timestamptz,
  feedback_response text,
  aviso_30_sent_at timestamptz,
  aviso_15_sent_at timestamptz,
  aviso_5_sent_at timestamptz,
  recompra_order_id uuid REFERENCES public.orders(id),
  coupon_code text,
  discount_percent numeric DEFAULT 0,
  product_duration_days integer DEFAULT 90,
  delivery_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.repurchase_funnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage repurchase funnel"
ON public.repurchase_funnel FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Repurchase goals table
CREATE TABLE public.repurchase_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  goal_count integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE public.repurchase_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage repurchase goals"
ON public.repurchase_goals FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_repurchase_funnel_updated_at
  BEFORE UPDATE ON public.repurchase_funnel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repurchase_goals_updated_at
  BEFORE UPDATE ON public.repurchase_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
