
-- Backfill tenant_id on whatsapp_instances from tenant_users of the creating user, 
-- or fallback to first tenant
UPDATE public.whatsapp_instances
SET tenant_id = COALESCE(
  (SELECT tenant_id FROM public.tenant_users LIMIT 1),
  '00000000-0000-0000-0000-000000000000'::uuid
)
WHERE tenant_id IS NULL;

-- Backfill whatsapp_conversations using instance data
UPDATE public.whatsapp_conversations wc
SET 
  tenant_id = COALESCE(wc.tenant_id, wi.tenant_id),
  instance_id = COALESCE(wc.instance_id, wi.id)
FROM public.whatsapp_instances wi
WHERE wc.instance_id = wi.id
  AND (wc.tenant_id IS NULL);

-- Backfill whatsapp_conversations that have no instance_id but have instance_name in logs
UPDATE public.whatsapp_conversations wc
SET tenant_id = (
  SELECT tenant_id FROM public.whatsapp_instances LIMIT 1
)
WHERE wc.tenant_id IS NULL;

-- Backfill whatsapp_message_log tenant_id
UPDATE public.whatsapp_message_log wml
SET tenant_id = (
  SELECT tenant_id FROM public.whatsapp_instances LIMIT 1
)
WHERE wml.tenant_id IS NULL;
