import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BLING_API = "https://www.bling.com.br/Api/v3";

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens } = await supabase
      .from("bling_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!tokens) {
      console.log("Bling não conectado. Nenhum token encontrado.");
      await supabase.from("integration_logs").insert({ integration: "bling", action: "token_refresh", status: "skipped", details: "Nenhum token encontrado" });
      return new Response(JSON.stringify({ message: "No token found" }), { status: 200 });
    }

    const now = Date.now();
    const expiresAt = new Date(tokens.expires_at).getTime();
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);

    console.log(`Token expira em ${hoursUntilExpiry.toFixed(1)} horas`);

    // Only refresh if expiring within 24 hours
    if (hoursUntilExpiry > 24) {
      console.log("Token ainda válido, sem necessidade de renovar.");
      await supabase.from("integration_logs").insert({ integration: "bling", action: "token_refresh", status: "skipped", details: `Token válido por mais ${hoursUntilExpiry.toFixed(1)}h` });
      return new Response(JSON.stringify({ message: "Token still valid", hours_remaining: hoursUntilExpiry }), { status: 200 });
    }

    const clientId = Deno.env.get("BLING_CLIENT_ID")!;
    const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
    const credentials = btoa(`${clientId}:${clientSecret}`);

    const res = await fetch(`${BLING_API}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      console.error("Falha ao renovar token do Bling:", data);
      
      await supabase.from("integration_logs").insert({ integration: "bling", action: "token_refresh", status: "error", details: JSON.stringify(data).slice(0, 500) });
      
      try {
        await supabase.from("admin_notifications").insert({
          type: "bling_token_expired",
          title: "Token do Bling expirado",
          message: `A renovação automática do token do Bling falhou. Reconecte o Bling em Integrações.`,
          read: false,
        });
      } catch (notifErr) {
        console.error("Falha ao criar notificação:", notifErr);
      }
      
      return new Response(JSON.stringify({ error: "Token refresh failed", details: data }), { status: 500 });
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await supabase
      .from("bling_tokens")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokens.id);

    console.log("Token do Bling renovado com sucesso! Nova expiração:", newExpiresAt);

    await supabase.from("integration_logs").insert({ integration: "bling", action: "token_refresh", status: "success", details: `Nova expiração: ${newExpiresAt}` });

    return new Response(
      JSON.stringify({ message: "Token refreshed", expires_at: newExpiresAt }),
      { status: 200 }
    );
  } catch (err) {
    console.error("bling-refresh-token error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
});
