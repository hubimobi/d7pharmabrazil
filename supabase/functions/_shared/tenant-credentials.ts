// Shared helper to read/write tenant-scoped integration credentials.
// Replaces global env-var secrets with per-tenant credentials stored in
// the `tenant_integrations` table.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export type IntegrationProvider =
  | "bling"
  | "tiktok_shop"
  | "asaas"
  | "evolution"
  | "ghl"
  | "cloudflare"
  | "melhor_envio";

export interface TenantCredentials {
  [key: string]: unknown;
}

/**
 * Service-role client (bypasses RLS). Only call from edge functions.
 */
export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Resolve tenant_id from the incoming request.
 * Order:
 *   1. Explicit `x-tenant-id` header
 *   2. JWT user → tenant_users.tenant_id
 *   3. Body `tenant_id` field (last resort)
 *   4. DEFAULT_TENANT_ID fallback
 */
export async function resolveTenantId(
  req: Request,
  body?: Record<string, unknown> | null,
): Promise<string> {
  const headerTid = req.headers.get("x-tenant-id");
  if (headerTid && isUuid(headerTid)) return headerTid;

  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const token = auth.slice(7);
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const service = getServiceClient();
        const { data } = await service
          .from("tenant_users")
          .select("tenant_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (data?.tenant_id) return data.tenant_id;
      }
    } catch (_) {
      // ignore — fall through
    }
  }

  if (body && typeof body === "object") {
    const bodyTid = (body as Record<string, unknown>).tenant_id;
    if (typeof bodyTid === "string" && isUuid(bodyTid)) return bodyTid;
  }

  return DEFAULT_TENANT_ID;
}

/**
 * Read credentials for a tenant + provider.
 * Returns `null` if the tenant has not configured this integration.
 * IMPORTANT: never falls back to global secrets — caller must handle null.
 */
export async function getTenantCredentials<T = TenantCredentials>(
  supabase: SupabaseClient,
  tenantId: string,
  provider: IntegrationProvider,
): Promise<T | null> {
  const { data, error } = await supabase
    .from("tenant_integrations")
    .select("credentials, active")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    console.error(`[tenant-credentials] read error (${provider}):`, error);
    return null;
  }
  if (!data || !data.active) return null;

  // Touch last_used_at (fire-and-forget)
  supabase
    .from("tenant_integrations")
    .update({ last_used_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .then(() => {});

  return (data.credentials as T) ?? null;
}

/**
 * Insert or update a tenant's credentials for a provider (upsert).
 */
export async function saveTenantCredentials(
  supabase: SupabaseClient,
  tenantId: string,
  provider: IntegrationProvider,
  credentials: TenantCredentials,
  active = true,
): Promise<{ error: unknown | null }> {
  const { error } = await supabase
    .from("tenant_integrations")
    .upsert(
      {
        tenant_id: tenantId,
        provider,
        credentials,
        active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,provider" },
    );

  if (error) {
    console.error(`[tenant-credentials] save error (${provider}):`, error);
  }
  return { error };
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
