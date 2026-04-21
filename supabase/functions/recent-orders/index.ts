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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("orders")
      .select("customer_name, items, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Supabase query error:", JSON.stringify(error));
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedidos recentes", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return only first names and item names - no PII
    const safeOrders = (data || []).map((o: any) => ({
      customer_name: o.customer_name?.split(" ")[0] || "Cliente",
      items: Array.isArray(o.items)
        ? o.items.map((i: any) => ({ name: i.name, product_id: i.product_id }))
        : [],
      created_at: o.created_at,
    }));

    return new Response(
      JSON.stringify({ orders: safeOrders }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
