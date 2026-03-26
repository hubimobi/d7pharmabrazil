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
    const { email, order_code } = await req.json();

    if (!email || !order_code) {
      return new Response(
        JSON.stringify({ error: "Email e código do pedido são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch orders by email, then filter by id prefix in code (UUID can't use ilike)
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, customer_name, items, total, status, shipping_address, tracking_code, created_at")
      .eq("customer_email", email);

    if (error) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const code = order_code.toLowerCase();
    const data = (orders || []).find((o: any) => o.id.toLowerCase().startsWith(code)) || null;


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
