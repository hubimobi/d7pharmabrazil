
CREATE TABLE public.whatsapp_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT false,
  trigger_event TEXT NOT NULL DEFAULT 'manual',
  trigger_value TEXT DEFAULT '',
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage flows"
ON public.whatsapp_flows
FOR ALL
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
  AND (tenant_id IN (SELECT unnest(public.get_user_tenant_ids())))
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
  AND (tenant_id IN (SELECT unnest(public.get_user_tenant_ids())))
);

CREATE TRIGGER update_whatsapp_flows_updated_at
BEFORE UPDATE ON public.whatsapp_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
