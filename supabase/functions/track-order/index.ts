import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Mask shipping address — return only city/state to limit PII exposure on a public endpoint
function maskShippingAddress(addr: any): any {
  if (!addr || typeof addr !== "object") return null;
  return {
    city: addr.city ?? null,
    state: addr.state ?? null,
  };
}

function shapeOrder(o: any) {
  if (!o) return null;
  return {
    id: o.id,
    customer_name: o.customer_name,
    items: o.items,
    total: o.total,
    status: o.status,
    shipping_address: maskShippingAddress(o.shipping_address),
    tracking_code: o.tracking_code,
    created_at: o.created_at,
  };
}

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

    // Reduce enumeration risk: require email when searching by CPF or order_code alone
    const hasEmail = !!(email && email.trim());
    const hasCpf = !!(cpf && cpf.trim().replace(/\D/g, "").length >= 11);
    const hasFullOrderId = !!(order_code && order_code.trim().length >= 32);

    if (!hasEmail && !hasFullOrderId) {
      return new Response(
        JSON.stringify({ error: "Informe seu e-mail junto com o CPF ou código do pedido para localizá-lo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cols = "id, customer_name, customer_email, items, total, status, shipping_address, tracking_code, created_at";
    let data: any = null;

    // Strategy 1: Full UUID order_code (no enumeration possible) — verify email matches if provided
    if (hasFullOrderId) {
      const code = order_code.trim().toLowerCase();
      const { data: exact } = await supabase
        .from("orders")
        .select(cols)
        .eq("id", code)
        .maybeSingle();

      if (exact) {
        if (hasEmail && exact.customer_email?.toLowerCase() !== email.trim().toLowerCase()) {
          // Don't leak which orders exist — return null
          data = null;
        } else {
          data = exact;
        }
      }
    }

    // Strategy 2: CPF must be combined with email
    if (!data && hasCpf && hasEmail) {
      const cleanCpf = cpf.trim().replace(/\D/g, "");
      const { data: cpfOrders } = await supabase
        .from("orders")
        .select(cols)
        .eq("customer_cpf", cleanCpf)
        .eq("customer_email", email.trim().toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1);

      data = cpfOrders?.[0] || null;
    }

    // Strategy 3: email only (most recent order)
    if (!data && hasEmail && !hasCpf) {
      const { data: emailOrders } = await supabase
        .from("orders")
        .select(cols)
        .eq("customer_email", email.trim().toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1);

      data = emailOrders?.[0] || null;
    }

    return new Response(
      JSON.stringify({ order: shapeOrder(data) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
