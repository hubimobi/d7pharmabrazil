// Shared Bling token resolver — reads from tenant_integrations and refreshes when needed.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_TENANT_ID } from "./tenant-credentials.ts";

const BLING_API = "https://www.bling.com.br/Api/v3";

export interface BlingCreds {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
}

/**
 * Get a valid Bling access token for a tenant. Refreshes if within 1 hour of expiry.
 * Throws if tenant has no Bling integration configured.
 */
export async function getBlingAccessToken(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  // 1. Try tenant_integrations first
  const { data: row } = await supabase
    .from("tenant_integrations")
    .select("credentials, active")
    .eq("tenant_id", tenantId)
    .eq("provider", "bling")
    .maybeSingle();

  let creds: BlingCreds | null = null;
  let source: "tenant" | "legacy" = "tenant";

  if (row?.active && row.credentials) {
    creds = row.credentials as BlingCreds;
  } else if (tenantId === DEFAULT_TENANT_ID) {
    // Legacy fallback — only for the default tenant (matriz) during transition
    const { data: legacy } = await supabase
      .from("bling_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (legacy) {
      creds = {
        access_token: legacy.access_token,
        refresh_token: legacy.refresh_token,
        expires_at: legacy.expires_at,
      };
      source = "legacy";
    }
  }

  if (!creds) {
    throw new Error("Bling não conectado para este tenant. Conecte pelo painel de integrações.");
  }

  const expiresAt = new Date(creds.expires_at).getTime();
  const now = Date.now();

  // Refresh if expiring within 1h
  if (expiresAt - now < 60 * 60 * 1000) {
    const clientId = Deno.env.get("BLING_CLIENT_ID")!;
    const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
    const auth = btoa(`${clientId}:${clientSecret}`);

    const res = await fetch(`${BLING_API}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: creds.refresh_token,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error("Falha ao renovar token do Bling. Reconecte pelo painel.");
    }

    const newCreds: BlingCreds = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };

    // Persist to tenant_integrations
    await supabase
      .from("tenant_integrations")
      .upsert(
        {
          tenant_id: tenantId,
          provider: "bling",
          credentials: newCreds,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,provider" },
      );

    // Mirror to legacy table if we read from there (default tenant only)
    if (source === "legacy") {
      await supabase
        .from("bling_tokens")
        .update({
          access_token: newCreds.access_token,
          refresh_token: newCreds.refresh_token,
          expires_at: newCreds.expires_at,
          updated_at: new Date().toISOString(),
        })
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return newCreds.access_token;
  }

  // Touch last_used_at
  supabase
    .from("tenant_integrations")
    .update({ last_used_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("provider", "bling")
    .then(() => {});

  return creds.access_token;
}
