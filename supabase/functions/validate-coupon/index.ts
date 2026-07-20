import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { code, tenant_id, subtotal = 0, product_ids = [] } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: "code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upper = String(code).toUpperCase().trim();

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select("id, code, discount_type, discount_value, free_shipping, product_id, doctor_id, active, expires_at, starts_at, max_uses, used_count, min_order_value, tenant_id")
      .eq("code", upper)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "invalid" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant check: coupon must belong to this tenant OR have no tenant (global)
    if (data.tenant_id && tenant_id && data.tenant_id !== tenant_id) {
      return new Response(JSON.stringify({ error: "invalid" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.starts_at && new Date(data.starts_at) > new Date()) {
      return new Response(JSON.stringify({ error: "not_yet_valid" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.max_uses && data.used_count >= data.max_uses) {
      return new Response(JSON.stringify({ error: "max_uses_reached" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.min_order_value && subtotal < Number(data.min_order_value)) {
      return new Response(
        JSON.stringify({ error: "min_order", min_order_value: data.min_order_value }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data.product_id) {
      const ids = Array.isArray(product_ids) ? product_ids : [];
      if (!ids.includes(data.product_id)) {
        return new Response(JSON.stringify({ error: "wrong_product" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Cupom vinculado a prescritor específico é sempre válido (sem restrições)
    // O checkout valida a seleção de prescritor separadamente

    return new Response(
      JSON.stringify({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        free_shipping: data.free_shipping,
        product_id: data.product_id,
        doctor_id: data.doctor_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
