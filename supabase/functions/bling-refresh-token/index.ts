import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBlingAccessToken } from "../_shared/bling-token.ts";

// Cron-driven: refreshes Bling tokens for ALL tenants that have an active integration.
serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integrations } = await supabase
      .from("tenant_integrations")
      .select("tenant_id, credentials, active")
      .eq("provider", "bling")
      .eq("active", true);

    if (!integrations || integrations.length === 0) {
      await supabase.from("integration_logs").insert({
        integration: "bling",
        action: "token_refresh",
        status: "skipped",
        details: "Nenhum tenant com integração Bling ativa",
      });
      return new Response(JSON.stringify({ message: "No active integrations" }), { status: 200 });
    }

    const results: Array<{ tenant_id: string; status: string; details?: string }> = [];

    for (const row of integrations) {
      try {
        // getBlingAccessToken auto-refreshes if expiring within 1h.
        // For the cron we proactively refresh anything within 24h by mutating the threshold:
        // Easiest: just call it; if expiry > 1h it returns existing token. So we additionally
        // check expiry here and force-refresh.
        const creds = row.credentials as { access_token: string; refresh_token: string; expires_at: string };
        const hoursLeft = (new Date(creds.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursLeft > 24) {
          results.push({ tenant_id: row.tenant_id, status: "skipped", details: `valid ${hoursLeft.toFixed(1)}h` });
          continue;
        }
        // Force a refresh by temporarily setting expires_at in the past via the helper path.
        // Simpler: directly call refresh here.
        const clientId = Deno.env.get("BLING_CLIENT_ID")!;
        const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
        const auth = btoa(`${clientId}:${clientSecret}`);
        const res = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
          body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: creds.refresh_token }),
        });
        const data = await res.json();
        if (!res.ok || !data.access_token) {
          results.push({ tenant_id: row.tenant_id, status: "error", details: JSON.stringify(data).slice(0, 200) });
          await supabase.from("admin_notifications").insert({
            type: "bling_token_expired",
            title: "Token do Bling expirado",
            message: `Renovação automática falhou para o tenant ${row.tenant_id}. Reconecte em Integrações.`,
            read: false,
            tenant_id: row.tenant_id,
          });
          continue;
        }
        const newCreds = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        };
        await supabase
          .from("tenant_integrations")
          .update({ credentials: newCreds, updated_at: new Date().toISOString() })
          .eq("tenant_id", row.tenant_id)
          .eq("provider", "bling");
        results.push({ tenant_id: row.tenant_id, status: "refreshed", details: newCreds.expires_at });
      } catch (e) {
        results.push({ tenant_id: row.tenant_id, status: "error", details: (e as Error).message });
      }
    }

    await supabase.from("integration_logs").insert({
      integration: "bling",
      action: "token_refresh_cron",
      status: "success",
      details: `${results.length} tenant(s) processados: ${JSON.stringify(results).slice(0, 400)}`,
    });

    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err) {
    console.error("bling-refresh-token error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
// Avoid unused-import warning when getBlingAccessToken is not directly referenced in cron path.
void getBlingAccessToken;
