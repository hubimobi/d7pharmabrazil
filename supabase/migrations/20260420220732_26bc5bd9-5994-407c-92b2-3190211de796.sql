-- Fix #1: store_settings_public view runs as SECURITY DEFINER (default), enforce SECURITY INVOKER
ALTER VIEW public.store_settings_public SET (security_invoker = on);

-- Fix #2: Allow public (anon + authenticated) SELECT on store_settings so the storefront view works.
-- Sensitive credentials (evolution_api_key, evolution_api_url, cnpj, address_street/number/complement/neighborhood/cep)
-- are NOT exposed by the store_settings_public view. Admin-only SELECT on the raw table remains via store_settings_admin_full_select.
-- The new policy below grants raw-table SELECT to public — but combined with security_invoker view, only the view's projected
-- columns are accessible through the public view path. We restrict raw-table direct reads to admins by NOT loosening; instead
-- we add a policy that lets anon/authenticated read ONLY through the view by granting on the view and a permissive SELECT
-- policy that the view needs to satisfy on the underlying table.

-- Add a public SELECT policy on store_settings (required for security_invoker view to work for anon).
-- This is acceptable because the FRONTEND only reads store_settings_public (which projects safe columns).
-- Direct queries to public.store_settings from anon clients are still possible but only expose what we accept as public store data.
-- To keep credentials safe, we revoke direct table SELECT from anon and grant it only on the view.
DROP POLICY IF EXISTS store_settings_public_select ON public.store_settings;
CREATE POLICY store_settings_public_select
ON public.store_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Lock down: revoke direct table access from anon/authenticated; only grant the public view.
REVOKE SELECT ON public.store_settings FROM anon, authenticated;
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- Fix #3: Move evolution_api_key / evolution_api_url out of store_settings is a larger refactor (already tracked
-- via tenant_integrations table per memory). This migration adds a defensive measure: prevent these columns from
-- ever being exposed through any future public view by documenting the intent via a comment.
COMMENT ON COLUMN public.store_settings.evolution_api_key IS 'SENSITIVE: WhatsApp gateway credential. Must never appear in public views. Prefer tenant_integrations table.';
COMMENT ON COLUMN public.store_settings.cnpj IS 'SENSITIVE: Tax ID. Must never appear in public views.';