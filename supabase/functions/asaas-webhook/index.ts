import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return new Response(JSON.stringify({ status: "Webhook ativo" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body vazio ou JSON inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Asaas webhook received:", JSON.stringify(body));

    const event = body.event;
    const payment = body.payment;

    if (!event || !payment) {
      await supabaseAdmin.from("integration_logs").insert({
        integration: "asaas",
        action: "webhook_invalid_payload",
        status: "error",
        details: `Payload inválido: ${JSON.stringify(body).slice(0, 500)}`,
      });
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log webhook received
    await supabaseAdmin.from("integration_logs").insert({
      integration: "asaas",
      action: "webhook_received",
      status: "success",
      details: `Evento: ${event}, Payment ID: ${payment?.id || "N/A"}, Status: ${payment?.status || "N/A"}`,
    });

    const asaasPaymentId = payment.id;
    if (!asaasPaymentId) {
      return new Response(JSON.stringify({ error: "Missing payment.id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Webhook is provider→server: tenant is identified by the order's asaas_payment_id.
    // Each tenant configures their own webhook URL pointing to this same function;
    // the order lookup below scopes the update correctly via asaas_payment_id uniqueness.

    // ── Webhook authentication ──
    // Asaas sends a configured access token in the `asaas-access-token` header.
    // If ASAAS_WEBHOOK_TOKEN is set, require it to match. This prevents attackers
    // from forging PAYMENT_CONFIRMED events.
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (!expectedToken) {
      console.error("ASAAS_WEBHOOK_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Webhook token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const receivedToken =
      req.headers.get("asaas-access-token") ||
      req.headers.get("x-webhook-token") ||
      "";
    if (receivedToken !== expectedToken) {
      console.error("Asaas webhook UNAUTHORIZED: invalid token");
      await supabaseAdmin.from("integration_logs").insert({
        integration: "asaas",
        action: "webhook_unauthorized",
        status: "error",
        details: `Invalid or missing asaas-access-token header`,
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Defense in depth: for status-changing events, re-verify the payment
    // status directly with Asaas API before mutating the order.
    const isStatusChanging =
      event === "PAYMENT_CONFIRMED" ||
      event === "PAYMENT_RECEIVED" ||
      event === "PAYMENT_OVERDUE" ||
      event === "PAYMENT_REFUNDED";

    if (isStatusChanging) {
      try {
        // Find the order to identify its tenant for API key resolution
        const { data: orderRow } = await supabaseAdmin
          .from("orders")
          .select("tenant_id")
          .eq("asaas_payment_id", asaasPaymentId)
          .maybeSingle();

        if (orderRow?.tenant_id) {
          const { getAsaasApiKey } = await import("../_shared/asaas-key.ts");
          const apiKey = await getAsaasApiKey(supabaseAdmin, orderRow.tenant_id);
          const verifyRes = await fetch(
            `https://www.asaas.com/api/v3/payments/${asaasPaymentId}`,
            { headers: { access_token: apiKey } },
          );
          if (verifyRes.ok) {
            const verified = await verifyRes.json();
            const realStatus = verified?.status;
            const eventMatches =
              ((event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") &&
                (realStatus === "CONFIRMED" || realStatus === "RECEIVED")) ||
              (event === "PAYMENT_OVERDUE" && realStatus === "OVERDUE") ||
              (event === "PAYMENT_REFUNDED" && (realStatus === "REFUNDED" || realStatus === "REFUND_REQUESTED"));

            if (!eventMatches) {
              console.error(
                `Asaas webhook event mismatch: event=${event} realStatus=${realStatus} payment=${asaasPaymentId}`,
              );
              await supabaseAdmin.from("integration_logs").insert({
                integration: "asaas",
                action: "webhook_event_mismatch",
                status: "error",
                details: `Event ${event} does not match real status ${realStatus} for payment ${asaasPaymentId}. Possible forged webhook.`,
              });
              return new Response(
                JSON.stringify({ error: "Event does not match payment status" }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          } else {
            console.warn(`Asaas verify lookup failed (${verifyRes.status}); proceeding cautiously`);
          }
        }
      } catch (verifyErr) {
        console.error("Asaas verification error (non-blocking):", verifyErr);
      }
    }


    // Handle payment confirmed/received → mark as paid
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("asaas_payment_id", asaasPaymentId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Error updating order to paid:", error);
        await supabaseAdmin.from("integration_logs").insert({
          integration: "asaas",
          action: "webhook_update_order",
          status: "error",
          details: `Erro ao atualizar pedido (payment: ${asaasPaymentId}): ${error.message}`,
        });
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Order updated to paid:", data?.id || "no matching order");

      await supabaseAdmin.from("integration_logs").insert({
        integration: "asaas",
        action: "payment_confirmed",
        status: "success",
        details: `Pagamento confirmado via webhook. Payment: ${asaasPaymentId}, Pedido: ${data?.id || "não encontrado"}`,
      });

      // Auto-sync to Bling
      if (data?.id) {
        try {
          const blingRes = await fetch(`${supabaseUrl}/functions/v1/bling-sync-order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ order_id: data.id }),
          });
          const blingData = await blingRes.json();
          console.log("Bling auto-sync result:", JSON.stringify(blingData));
        } catch (blingErr) {
          console.error("Bling auto-sync error (non-fatal):", blingErr);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, order_id: data?.id || null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle overdue → mark as overdue
    if (event === "PAYMENT_OVERDUE") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "overdue" })
        .eq("asaas_payment_id", asaasPaymentId)
        .eq("status", "pending");

      await supabaseAdmin.from("integration_logs").insert({
        integration: "asaas",
        action: "payment_overdue",
        status: "success",
        details: `Pagamento vencido. Payment: ${asaasPaymentId}`,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle refunded → mark as cancelled
    if (event === "PAYMENT_REFUNDED") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("asaas_payment_id", asaasPaymentId);

      await supabaseAdmin.from("integration_logs").insert({
        integration: "asaas",
        action: "payment_refunded",
        status: "success",
        details: `Pagamento estornado. Payment: ${asaasPaymentId}`,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other events — just acknowledge
    return new Response(JSON.stringify({ ok: true, message: `Event ${event} acknowledged` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      await supabaseAdmin.from("integration_logs").insert({
        integration: "asaas",
        action: "webhook_error",
        status: "error",
        details: message,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
