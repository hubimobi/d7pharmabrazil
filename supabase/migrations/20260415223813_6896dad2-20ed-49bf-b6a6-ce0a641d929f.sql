UPDATE public.whatsapp_instances 
SET status = 'connected', qr_code = null 
WHERE instance_name IN ('d7pharma_1775963855976', 'd7pharma_1776107871039', 'd7pharma_1776199525474')
AND status != 'connected';