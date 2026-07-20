-- Ensure MGA1R7 coupon exists and is active
DO $$
BEGIN
  INSERT INTO public.coupons (
    code, description, discount_type, discount_value,
    free_shipping, active, tenant_id, created_at, updated_at
  )
  VALUES (
    'MGA1R7',
    'Cupom MGA1R7 - 10% desconto',
    'percent',
    10,
    true,
    '00000000-0000-0000-0000-000000000000',
    now(),
    now()
  );
EXCEPTION WHEN unique_violation THEN
  -- Coupon already exists, just ensure it's active
  UPDATE public.coupons
  SET active = true, updated_at = now()
  WHERE code = 'MGA1R7';
END $$;
