-- Estado de round-robin para o nó Split do flow editor
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_split_state (
  flow_id uuid NOT NULL,
  node_id text NOT NULL,
  last_index integer NOT NULL DEFAULT -1,
  tenant_id uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (flow_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_split_state_tenant
  ON public.whatsapp_flow_split_state(tenant_id);

ALTER TABLE public.whatsapp_flow_split_state ENABLE ROW LEVEL SECURITY;

-- Apenas membros do tenant ou super admins podem ver/manipular
CREATE POLICY "Tenant members can view split state"
ON public.whatsapp_flow_split_state FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NULL)
  OR public.user_belongs_to_tenant(tenant_id)
);

CREATE POLICY "Tenant members can insert split state"
ON public.whatsapp_flow_split_state FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NULL)
  OR public.user_belongs_to_tenant(tenant_id)
);

CREATE POLICY "Tenant members can update split state"
ON public.whatsapp_flow_split_state FOR UPDATE
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NULL)
  OR public.user_belongs_to_tenant(tenant_id)
);

CREATE POLICY "Tenant members can delete split state"
ON public.whatsapp_flow_split_state FOR DELETE
USING (
  public.is_super_admin(auth.uid())
  OR public.user_belongs_to_tenant(tenant_id)
);

-- Aplicar trigger global de tenant_id
DROP TRIGGER IF EXISTS ensure_tenant_id_trigger ON public.whatsapp_flow_split_state;
CREATE TRIGGER ensure_tenant_id_trigger
BEFORE INSERT ON public.whatsapp_flow_split_state
FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id();