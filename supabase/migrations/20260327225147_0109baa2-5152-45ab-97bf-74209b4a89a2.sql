
-- Add recovery pipeline fields to abandoned_carts
ALTER TABLE public.abandoned_carts 
ADD COLUMN IF NOT EXISTS recovery_stage text NOT NULL DEFAULT 'novo',
ADD COLUMN IF NOT EXISTS ai_agent_active boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_contact_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
ADD COLUMN IF NOT EXISTS recovery_notes text,
ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL;

-- Update existing abandoned carts to have correct stages
UPDATE public.abandoned_carts SET recovery_stage = 'recuperado' WHERE status = 'recovered';

-- Create function to auto-convert abandoned cart when order is created
CREATE OR REPLACE FUNCTION public.auto_recover_abandoned_cart()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Match by phone or email
  IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '' THEN
    UPDATE public.abandoned_carts 
    SET recovery_stage = 'convertido', 
        status = 'recovered', 
        recovered_at = now(),
        ai_agent_active = false
    WHERE customer_phone = NEW.customer_phone 
      AND status = 'abandoned'
      AND recovery_stage != 'convertido';
  END IF;
  
  IF NEW.customer_email IS NOT NULL AND NEW.customer_email != '' THEN
    UPDATE public.abandoned_carts 
    SET recovery_stage = 'convertido', 
        status = 'recovered', 
        recovered_at = now(),
        ai_agent_active = false
    WHERE customer_email = NEW.customer_email 
      AND status = 'abandoned'
      AND recovery_stage != 'convertido';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trg_auto_recover_cart ON public.orders;
CREATE TRIGGER trg_auto_recover_cart
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recover_abandoned_cart();
