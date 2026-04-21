import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check - financeiro/admin only
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","financeiro"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { representative_id, representative_name, representative_pix, commission_ids, total, type } = await req.json();

    if (!representative_id || !commission_ids?.length || !total) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!representative_pix) {
      return new Response(JSON.stringify({ error: "PIX não cadastrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasApiKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const paymentType = type === "prescriber" ? "Prescritor" : "Representante";

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
        description: `Comissões ${paymentType} ${representative_name} - ${commission_ids.length} pedidos`,
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
      action: `Transferência comissões ${paymentType} ${representative_name}`,
      status: "success",
      details: `Total: R$ ${total.toFixed(2)} | ${commission_ids.length} comissões | Asaas ID: ${paymentId}`,
    });

    return new Response(JSON.stringify({ ok: true, payment_id: paymentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("pay-commissions error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
