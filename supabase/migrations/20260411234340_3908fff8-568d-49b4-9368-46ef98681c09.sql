
-- Create whatsapp_conversations table
CREATE TABLE public.whatsapp_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  contact_phone text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wa_conv_tenant_phone ON public.whatsapp_conversations (tenant_id, contact_phone);
CREATE INDEX idx_wa_conv_status ON public.whatsapp_conversations (tenant_id, status);
CREATE INDEX idx_wa_conv_last_msg ON public.whatsapp_conversations (tenant_id, last_message_at DESC);

-- RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_iso_select" ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_insert" ON public.whatsapp_conversations FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_update" ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin())
  WITH CHECK ((tenant_id = current_tenant_id()) OR is_super_admin());

CREATE POLICY "tenant_iso_delete" ON public.whatsapp_conversations FOR DELETE TO authenticated
  USING ((tenant_id = current_tenant_id()) OR is_super_admin());

-- Updated_at trigger
CREATE TRIGGER update_wa_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add conversation_id to message_log (nullable for retrocompat)
ALTER TABLE public.whatsapp_message_log
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.whatsapp_conversations(id);

CREATE INDEX idx_wa_log_conversation ON public.whatsapp_message_log (conversation_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
