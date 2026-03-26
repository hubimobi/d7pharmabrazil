
-- Update commission trigger to check if representative is active
CREATE OR REPLACE FUNCTION public.create_commission_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rep_id uuid;
  _rep_active boolean;
  _cashback numeric;
  _products_total numeric;
  _item record;
BEGIN
  IF NEW.doctor_id IS NOT NULL THEN
    SELECT representative_id INTO _rep_id FROM public.doctors WHERE id = NEW.doctor_id;
    IF _rep_id IS NOT NULL THEN
      -- Check if representative is active
      SELECT active INTO _rep_active FROM public.representatives WHERE id = _rep_id;
      IF _rep_active IS NOT TRUE THEN
        RETURN NEW; -- Skip commission for inactive representatives
      END IF;
      
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

-- Also generate commission when order is linked via coupon code to a doctor
-- We can track purchases by coupon: if coupon code matches DESCONTO10-XXXX-YYYY pattern, link to doctor
CREATE OR REPLACE FUNCTION public.link_order_to_doctor_by_coupon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _doc_short text;
  _doctor_id uuid;
BEGIN
  -- If order already has a doctor_id, skip
  IF NEW.doctor_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- If no coupon code, skip
  IF NEW.coupon_code IS NULL OR NEW.coupon_code = '' THEN
    RETURN NEW;
  END IF;
  
  -- Check if coupon matches DESCONTO10-XXXX-YYYY pattern
  IF NEW.coupon_code LIKE 'DESCONTO10-%' THEN
    -- Extract the doctor short id (last 4 chars after second dash)
    _doc_short := split_part(NEW.coupon_code, '-', 3);
    IF _doc_short IS NOT NULL AND length(_doc_short) = 4 THEN
      -- Find doctor whose id starts with this prefix (case insensitive)
      SELECT id INTO _doctor_id FROM public.doctors 
      WHERE upper(left(id::text, 4)) = upper(_doc_short) 
      LIMIT 1;
      
      IF _doctor_id IS NOT NULL THEN
        NEW.doctor_id := _doctor_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to link orders to doctors by coupon (BEFORE INSERT so commission trigger fires with doctor_id set)
DROP TRIGGER IF EXISTS link_order_doctor_coupon ON public.orders;
CREATE TRIGGER link_order_doctor_coupon
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.link_order_to_doctor_by_coupon();
