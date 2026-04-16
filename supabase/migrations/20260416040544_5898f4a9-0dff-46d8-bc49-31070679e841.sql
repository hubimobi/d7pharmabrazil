UPDATE public.whatsapp_message_queue 
SET 
  contact_phone = '55' || contact_phone,
  retry_count = 0,
  error_message = null
WHERE status IN ('pending', 'failed')
  AND length(regexp_replace(contact_phone, '\D', '', 'g')) IN (10, 11)
  AND contact_phone NOT LIKE '55%';