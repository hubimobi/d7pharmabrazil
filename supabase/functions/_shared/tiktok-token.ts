// Shared TikTok Shop token resolver — reads from tenant_integrations.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_TENANT_ID } from "./tenant-credentials.ts";

export interface TikTokCreds {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  shop_id?: string;
  app_key?: string;
  app_secret?: string;
}

/**
 * Returns { access_token, shop_id, app_key, app_secret } for a tenant.
 * App credentials may be stored in tenant_integrations OR fall back to env (single TikTok app).
 */
export async function getTikTokCreds(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ access_token: string; shop_id: string; app_key: string; app_secret: string }> {
  const { data: row } = await supabase
    .from("tenant_integrations")
    .select("credentials, active")
    .eq("tenant_id", tenantId)
    .eq("provider", "tiktok_shop")
    .maybeSingle();

  let creds: TikTokCreds | null = null;
  let source: "tenant" | "legacy" = "tenant";

  if (row?.active && row.credentials) {
    creds = row.credentials as TikTokCreds;
  } else if (tenantId === DEFAULT_TENANT_ID) {
    const { data: legacy } = await supabase
      .from("tiktok_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (legacy) {
      creds = {
        access_token: legacy.access_token,
        refresh_token: legacy.refresh_token,
        expires_at: legacy.expires_at,
        shop_id: legacy.shop_id,
      };
      source = "legacy";
    }
  }

  if (!creds) {
    throw new Error("TikTok Shop não conectado para este tenant.");
  }

  const appKey = creds.app_key || Deno.env.get("TIKTOK_APP_KEY") || "";
  const appSecret = creds.app_secret || Deno.env.get("TIKTOK_APP_SECRET") || "";
  if (!appKey || !appSecret) {
    throw new Error("TikTok app credentials not configured");
  }

  // Refresh if expiring within 24h
  const expiresAt = new Date(creds.expires_at).getTime();
  if (expiresAt - Date.now() < 24 * 60 * 60 * 1000) {
    const res = await fetch("https://auth.tiktok-shops.com/api/v2/token/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret,
        refresh_token: creds.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.code === 0 && data.data?.access_token) {
      const newCreds: TikTokCreds = {
        ...creds,
        access_token: data.data.access_token,
        refresh_token: data.data.refresh_token,
        expires_at: new Date(Date.now() + data.data.access_token_expire_in * 1000).toISOString(),
      };
      await supabase.from("tenant_integrations").upsert(
        {
          tenant_id: tenantId,
          provider: "tiktok_shop",
          credentials: newCreds,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,provider" },
      );
      if (source === "legacy") {
        await supabase
          .from("tiktok_tokens")
          .update({
            access_token: newCreds.access_token,
            refresh_token: newCreds.refresh_token,
            expires_at: newCreds.expires_at,
          })
          .order("created_at", { ascending: false })
          .limit(1);
      }
      creds = newCreds;
    }
  }

  if (!creds.shop_id) {
    throw new Error("TikTok shop_id não configurado.");
  }

  return {
    access_token: creds.access_token,
    shop_id: creds.shop_id,
    app_key: appKey,
    app_secret: appSecret,
  };
}
