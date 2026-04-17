import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  DEFAULT_TENANT_ID,
  saveTenantCredentials,
} from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    // OAuth `state` carries the tenant_id so the callback writes to the
    // correct tenant. Falls back to the default tenant for backward-compat.
    const stateRaw = url.searchParams.get("state") ?? "";
    const tenantId = isUuid(stateRaw) ? stateRaw : DEFAULT_TENANT_ID;

    if (!code) {
      return new Response("Código de autorização não encontrado. Volte ao painel admin e tente novamente.", {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const clientId = Deno.env.get("BLING_CLIENT_ID")!;
    const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
    const credentials = btoa(`${clientId}:${clientSecret}`);

    // Exchange code for tokens
    const tokenRes = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
      }),
    });

    // Safe JSON parsing
    const tokenText = await tokenRes.text();
    console.log("Bling token response status:", tokenRes.status);
    console.log("Bling token response body:", tokenText.substring(0, 500));

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("Bling returned non-JSON response:", tokenText.substring(0, 500));
      return new Response(`Erro ao conectar com o Bling. Resposta inesperada (HTTP ${tokenRes.status}). Tente novamente.`, {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Bling token error:", tokenData);
      return new Response("Erro ao obter token do Bling. Verifique as credenciais.", {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Delete old tokens and insert new one
    await supabase.from("bling_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insertError } = await supabase.from("bling_tokens").insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response("Erro ao salvar token.", {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Redirect back to admin integrations page
    const siteUrl = "https://d7pharmabrazil.lovable.app/admin/integracoes";
    return new Response(null, {
      status: 302,
      headers: { Location: siteUrl },
    });
  } catch (err) {
    console.error("Bling callback error:", err);
    return new Response("Erro interno ao processar autenticação do Bling.", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
