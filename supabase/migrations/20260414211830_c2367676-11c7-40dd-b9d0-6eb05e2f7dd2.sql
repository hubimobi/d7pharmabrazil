
-- 1. Drop the overly permissive anon_select on store_settings
DROP POLICY IF EXISTS "anon_select" ON public.store_settings;

-- 2. Harden current_tenant_id() — remove client-settable session variable fallback
CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1
$function$;
