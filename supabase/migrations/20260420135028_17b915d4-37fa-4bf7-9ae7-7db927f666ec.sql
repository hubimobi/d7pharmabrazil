-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  user_name text,
  action text NOT NULL, -- INSERT | UPDATE | DELETE
  table_name text NOT NULL,
  record_id text,
  record_label text, -- friendly label (e.g. product name)
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tenant_created ON public.audit_log (tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_table ON public.audit_log (table_name, created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log (user_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only tenant staff/super admin can view
CREATE POLICY "audit_log_select_staff"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (tenant_id IS NOT NULL AND public.is_tenant_staff(tenant_id))
);

-- Inserts only via SECURITY DEFINER trigger function
CREATE POLICY "audit_log_insert_system"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger function to record changes
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_email text;
  _user_name text;
  _tenant_id uuid;
  _record_id text;
  _record_label text;
  _old jsonb;
  _new jsonb;
BEGIN
  -- Skip if no user (system writes, edge functions sem JWT, cron jobs)
  IF _user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Resolve user info
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  SELECT full_name INTO _user_name FROM public.profiles WHERE user_id = _user_id LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _new := NULL;
    _record_id := COALESCE(_old->>'id', '');
    _tenant_id := NULLIF(_old->>'tenant_id','')::uuid;
  ELSIF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _record_id := COALESCE(_new->>'id', '');
    _tenant_id := NULLIF(_new->>'tenant_id','')::uuid;
  ELSE -- INSERT
    _old := NULL;
    _new := to_jsonb(NEW);
    _record_id := COALESCE(_new->>'id', '');
    _tenant_id := NULLIF(_new->>'tenant_id','')::uuid;
  END IF;

  -- Friendly label
  _record_label := COALESCE(
    _new->>'name',
    _new->>'title',
    _new->>'code',
    _new->>'slug',
    _old->>'name',
    _old->>'title',
    _old->>'code',
    _old->>'slug',
    ''
  );

  INSERT INTO public.audit_log (
    tenant_id, user_id, user_email, user_name, action, table_name, record_id, record_label, old_data, new_data
  ) VALUES (
    _tenant_id, _user_id, _user_email, COALESCE(_user_name, _user_email), TG_OP, TG_TABLE_NAME, _record_id, _record_label, _old, _new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to relevant tables
CREATE TRIGGER trg_audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_product_combos
AFTER INSERT OR UPDATE OR DELETE ON public.product_combos
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_hero_banners
AFTER INSERT OR UPDATE OR DELETE ON public.hero_banners
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_promo_banners
AFTER INSERT OR UPDATE OR DELETE ON public.promo_banners
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_coupons
AFTER INSERT OR UPDATE OR DELETE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_static_pages
AFTER INSERT OR UPDATE OR DELETE ON public.static_pages
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();