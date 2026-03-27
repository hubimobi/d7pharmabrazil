import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { representative_id, representative_name, representative_pix, commission_ids, total } = await req.json();

    if (!representative_id || !commission_ids?.length || !total) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!representative_pix) {
      return new Response(JSON.stringify({ error: "PIX do representante não cadastrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasApiKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create transfer in Asaas
    const asaasRes = await fetch("https://www.asaas.com/api/v3/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        value: total,
        pixAddressKey: representative_pix,
        pixAddressKeyType: "EVP",
        description: `Comissões ${representative_name} - ${commission_ids.length} pedidos`,
        scheduleDate: null,
      }),
    });

    const asaasData = await asaasRes.json();

    if (!asaasRes.ok) {
      console.error("Asaas transfer error:", JSON.stringify(asaasData));
      return new Response(JSON.stringify({ error: asaasData?.errors?.[0]?.description || "Erro ao criar transferência no Asaas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = asaasData.id || "";

    // Update commissions status to awaiting
    const { error: updateError } = await supabase
      .from("commissions")
      .update({ status: "awaiting", payment_id: paymentId })
      .in("id", commission_ids);

    if (updateError) {
      console.error("Error updating commissions:", updateError);
    }

    // Log
    await supabase.from("integration_logs").insert({
      integration: "asaas",
      action: `Transferência comissões ${representative_name}`,
      status: "success",
      details: `Total: R$ ${total.toFixed(2)} | ${commission_ids.length} comissões | Asaas ID: ${paymentId}`,
    });

    return new Response(JSON.stringify({ ok: true, payment_id: paymentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pay-commissions error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
