-- 1. short_links: drop anon SELECT on raw table; rely on projection view
DROP POLICY IF EXISTS anon_select ON public.short_links;

-- Switch view to SECURITY DEFINER so anon can read via projection without base-table RLS access
ALTER VIEW public.short_links_public SET (security_invoker = off);
GRANT SELECT ON public.short_links_public TO anon, authenticated;

-- 2. audit_log: remove authenticated INSERT policy (service role bypasses RLS)
DROP POLICY IF EXISTS tenant_iso_insert ON public.audit_log;

-- 3. whatsapp_campaigns: ensure RLS is enabled (idempotent)
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns FORCE ROW LEVEL SECURITY;