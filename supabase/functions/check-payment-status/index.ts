import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAsaasApiKey } from "../_shared/asaas-key.ts";
import { DEFAULT_TENANT_ID } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API = "https://www.asaas.com/api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, order_id } = await req.json();

    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve tenant from the order if available
    let tenantId = DEFAULT_TENANT_ID;
    if (order_id) {
      const { data: ord } = await supabase
        .from("orders")
        .select("tenant_id")
        .eq("id", order_id)
        .maybeSingle();
      if (ord?.tenant_id) tenantId = ord.tenant_id;
    }
    const asaasKey = await getAsaasApiKey(supabase, tenantId);

    // Query Asaas for payment status
    const res = await fetch(`${ASAAS_API}/payments/${payment_id}`, {
      headers: { access_token: asaasKey },
    });

    if (!res.ok) {
      const errorText = await res.text();
      await supabase.from("integration_logs").insert({
        integration: "asaas",
        action: "check_payment_status",
        status: "error",
        details: `Erro ao consultar pagamento ${payment_id}: ${errorText}`,
      });
      throw new Error(`Asaas API error [${res.status}]: ${errorText}`);
    }

    const payment = await res.json();
    const status = payment.status;

    // If confirmed/received, update order status in DB and sync with Bling
    if (order_id && (status === "CONFIRMED" || status === "RECEIVED")) {
      const { data: updatedOrder } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order_id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      // If order was actually updated (was pending), sync with Bling
      if (updatedOrder) {
        await supabase.from("integration_logs").insert({
          integration: "asaas",
          action: "payment_confirmed_polling",
          status: "success",
          details: `Pagamento ${payment_id} confirmado via polling. Pedido ${order_id} atualizado para "paid".`,
        });

        try {
          await fetch(`${supabaseUrl}/functions/v1/bling-sync-order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ order_id }),
          });
          console.log("Bling sync triggered for order:", order_id);
        } catch (blingErr) {
          console.error("Bling sync failed (non-fatal):", blingErr);
        }
      }
    }

    return new Response(JSON.stringify({ status, payment_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-payment-status error:", err);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("integration_logs").insert({
        integration: "asaas",
        action: "check_payment_error",
        status: "error",
        details: err.message,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
