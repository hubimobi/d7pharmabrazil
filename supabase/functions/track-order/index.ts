import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, order_code, cpf } = await req.json();

    if (!email && !order_code && !cpf) {
      return new Response(
        JSON.stringify({ error: "Informe ao menos um campo para busca" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let data = null;

    // Strategy 1: Search by exact order ID (full UUID or prefix)
    if (order_code && order_code.trim().length >= 8) {
      const code = order_code.trim().toLowerCase();
      // Try exact match first
      const { data: exact } = await supabase
        .from("orders")
        .select("id, customer_name, items, total, status, shipping_address, tracking_code, created_at")
        .eq("id", code)
        .maybeSingle();

      if (exact) {
        data = exact;
      } else {
        // Try prefix match - fetch recent orders and filter
        const { data: orders } = await supabase
          .from("orders")
          .select("id, customer_name, items, total, status, shipping_address, tracking_code, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        data = (orders || []).find((o: any) => o.id.toLowerCase().startsWith(code)) || null;
      }
    }

    // Strategy 2: Search by CPF
    if (!data && cpf && cpf.trim().length >= 11) {
      const cleanCpf = cpf.trim().replace(/\D/g, "");
      const { data: cpfOrders } = await supabase
        .from("orders")
        .select("id, customer_name, items, total, status, shipping_address, tracking_code, created_at")
        .eq("customer_cpf", cleanCpf)
        .order("created_at", { ascending: false })
        .limit(1);

      data = cpfOrders?.[0] || null;
    }

    // Strategy 3: Search by email + optional order code prefix
    if (!data && email && email.trim()) {
      const { data: emailOrders } = await supabase
        .from("orders")
        .select("id, customer_name, items, total, status, shipping_address, tracking_code, created_at")
        .eq("customer_email", email.trim().toLowerCase())
        .order("created_at", { ascending: false });

      if (order_code && order_code.trim()) {
        const code = order_code.trim().toLowerCase();
        data = (emailOrders || []).find((o: any) => o.id.toLowerCase().startsWith(code)) || null;
      } else {
        data = emailOrders?.[0] || null;
      }
    }

    return new Response(
      JSON.stringify({ order: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
