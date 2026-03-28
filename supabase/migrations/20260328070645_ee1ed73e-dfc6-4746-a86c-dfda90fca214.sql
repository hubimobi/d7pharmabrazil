
-- Fix security definer view by setting it to security invoker
ALTER VIEW public.short_links_public SET (security_invoker = on);
