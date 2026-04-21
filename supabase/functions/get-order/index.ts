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
    const { order_id, customer_email } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_email, items, total, status, shipping_address, tracking_code, created_at")
      .eq("id", order_id)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require email verification to prevent data exposure
    if (data && customer_email) {
      if (data.customer_email?.toLowerCase() !== customer_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ order: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Strip sensitive fields if no email verification provided
    if (data && !customer_email) {
      // Only return minimal info without email verification
      return new Response(
        JSON.stringify({ order: { id: data.id, status: data.status, created_at: data.created_at } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ order: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
