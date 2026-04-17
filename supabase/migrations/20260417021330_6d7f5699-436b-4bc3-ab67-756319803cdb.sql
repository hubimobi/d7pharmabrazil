
ALTER TABLE public.whatsapp_message_queue
  ADD COLUMN IF NOT EXISTS broadcast_id uuid,
  ADD COLUMN IF NOT EXISTS broadcast_name text,
  ADD COLUMN IF NOT EXISTS flow_id uuid REFERENCES public.whatsapp_flows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_broadcast ON public.whatsapp_message_queue(broadcast_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_message_queue;
