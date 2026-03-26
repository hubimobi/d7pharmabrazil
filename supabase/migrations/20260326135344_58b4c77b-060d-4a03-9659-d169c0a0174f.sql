CREATE OR REPLACE FUNCTION public.create_commission_for_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _rep_id uuid;
  _cashback numeric;
  _products_total numeric;
  _item record;
BEGIN
  IF NEW.doctor_id IS NOT NULL THEN
    SELECT representative_id INTO _rep_id FROM public.doctors WHERE id = NEW.doctor_id;
    IF _rep_id IS NOT NULL THEN
      -- Calculate products-only total (exclude shipping)
      _products_total := 0;
      IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
        FOR _item IN SELECT * FROM jsonb_array_elements(NEW.items) AS elem
        LOOP
          _products_total := _products_total + (COALESCE((_item.elem->>'price')::numeric, 0) * COALESCE((_item.elem->>'quantity')::numeric, 1));
        END LOOP;
      ELSE
        _products_total := NEW.total;
      END IF;
      
      _cashback := _products_total * 0.20;
      INSERT INTO public.commissions (order_id, representative_id, doctor_id, order_total, commission_rate, commission_value)
      VALUES (NEW.id, _rep_id, NEW.doctor_id, _products_total, 20, _cashback);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;