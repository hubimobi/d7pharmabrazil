import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { name, email, cpf, pix, crm, specialty, state, city, representative_id, rep_code } = body;

    if (!name || !email || !representative_id) {
      return new Response(JSON.stringify({ error: "Nome, e-mail e representante são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from("doctors")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado como prescritor." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if rep_code matches the representative
    let isAutoApproved = false;
    if (rep_code) {
      const { data: rep } = await supabase
        .from("representatives")
        .select("id, short_code")
        .eq("id", representative_id)
        .single();

      if (rep && (rep.short_code?.toUpperCase() === rep_code.toUpperCase() || rep.id === rep_code)) {
        isAutoApproved = true;
      }
    }

    // Insert doctor
    const { data: inserted, error: insertErr } = await supabase
      .from("doctors")
      .insert({
        name,
        email,
        cpf: cpf || null,
        pix: pix || null,
        crm: crm || null,
        specialty: specialty || null,
        state: state || null,
        city: city || null,
        representative_id,
        approval_status: isAutoApproved ? "approved" : "pending",
        active: isAutoApproved,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate coupon code
    const initials = name.split(/\s+/).filter(Boolean).map((w: string) => w[0].toUpperCase()).join("");
    const randomDigit = Math.floor(Math.random() * 10);
    const { count } = await supabase.from("doctors").select("id", { count: "exact", head: true });
    const seq = count ?? 1;
    const couponCode = `${initials}${randomDigit}R${seq}`;

    await supabase.from("coupons").insert({
      code: couponCode,
      description: `Cupom do Prescritor ${name}`,
      discount_type: "percent",
      discount_value: 10,
      active: isAutoApproved,
      doctor_id: inserted.id,
      representative_id,
    });

    return new Response(JSON.stringify({
      success: true,
      doctor_id: inserted.id,
      name: inserted.name,
      coupon_code: couponCode,
      email: inserted.email,
      auto_approved: isAutoApproved,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
