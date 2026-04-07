import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://www.asaas.com/api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY is not configured");
    }

    const body = await req.json();
    const {
      customer_name,
      customer_email,
      customer_cpf,
      customer_phone,
      billing_type, // "PIX" or "CREDIT_CARD"
      value,
      items,
      doctor_id,
      credit_card,
      credit_card_holder_info,
      installment_count,
      remote_ip,
      shipping_address,
      coupon_code,
    } = body;

    if (!customer_name || !customer_email || !customer_cpf || !billing_type || !value) {
      return new Response(
        JSON.stringify({ error: "Dados obrigatórios: nome, email, CPF, tipo de pagamento e valor" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create or find customer in Asaas
    const customerRes = await fetch(`${ASAAS_API}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name: customer_name,
        email: customer_email,
        cpfCnpj: customer_cpf.replace(/\D/g, ""),
        phone: customer_phone?.replace(/\D/g, "") || undefined,
      }),
    });

    const customerData = await customerRes.json();
    if (!customerRes.ok && !customerData.id) {
      // Try to find existing customer by CPF
      const searchRes = await fetch(
        `${ASAAS_API}/customers?cpfCnpj=${customer_cpf.replace(/\D/g, "")}`,
        { headers: { access_token: ASAAS_API_KEY } }
      );
      const searchData = await searchRes.json();
      if (searchData.data?.length > 0) {
        customerData.id = searchData.data[0].id;
      } else {
        console.error("Asaas customer creation error:", JSON.stringify(customerData));
        throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerData)}`);
      }
    }

    const customerId = customerData.id;

    // 2. Create payment
    const today = new Date();
    const dueDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const paymentPayload: any = {
      customer: customerId,
      billingType: billing_type,
      value: Number(value),
      dueDate: dueDateStr,
      description: `Pedido D7 Pharma`,
    };

    // For credit card with tokenization
    if (billing_type === "CREDIT_CARD" && credit_card) {
      paymentPayload.creditCard = {
        holderName: credit_card.holderName,
        number: credit_card.number,
        expiryMonth: credit_card.expiryMonth,
        expiryYear: credit_card.expiryYear,
        ccv: credit_card.ccv,
      };
      paymentPayload.creditCardHolderInfo = {
        name: credit_card_holder_info?.name || customer_name,
        email: credit_card_holder_info?.email || customer_email,
        cpfCnpj: (credit_card_holder_info?.cpfCnpj || customer_cpf).replace(/\D/g, ""),
        postalCode: credit_card_holder_info?.postalCode?.replace(/\D/g, "") || "",
        addressNumber: credit_card_holder_info?.addressNumber || "",
        phone: (credit_card_holder_info?.phone || customer_phone)?.replace(/\D/g, "") || "",
      };
      if (installment_count && installment_count > 1) {
        paymentPayload.installmentCount = installment_count;
        paymentPayload.installmentValue = Number((value / installment_count).toFixed(2));
      }
      if (remote_ip) {
        paymentPayload.remoteIp = remote_ip;
      }
    }

    const paymentRes = await fetch(`${ASAAS_API}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) {
      console.error("Asaas payment creation error:", JSON.stringify(paymentData));
      throw new Error(`Erro ao criar cobrança: ${JSON.stringify(paymentData)}`);
    }

    // 3. If PIX, get QR Code
    let pixData = null;
    if (billing_type === "PIX") {
      const pixRes = await fetch(`${ASAAS_API}/payments/${paymentData.id}/pixQrCode`, {
        headers: { access_token: ASAAS_API_KEY },
      });
      const pixResult = await pixRes.json();
      if (pixRes.ok) {
        pixData = {
          encodedImage: pixResult.encodedImage,
          payload: pixResult.payload,
          expirationDate: pixResult.expirationDate,
        };
      }
    }

    // 4. Save order to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Resolve doctor_id: use provided value, or fallback to coupon's linked doctor
    let resolvedDoctorId = doctor_id || null;
    if (!resolvedDoctorId && coupon_code) {
      const { data: couponRow } = await supabaseAdmin
        .from("coupons")
        .select("doctor_id")
        .eq("code", coupon_code)
        .maybeSingle();
      if (couponRow?.doctor_id) {
        resolvedDoctorId = couponRow.doctor_id;
      }
    }

    const { data: order, error: orderError } = await supabaseAdmin.from("orders").insert({
      customer_name,
      customer_email,
      customer_phone,
      customer_cpf,
      doctor_id: resolvedDoctorId,
      items: items || [],
      total: Number(value),
      status: paymentData.status === "CONFIRMED" || paymentData.status === "RECEIVED" ? "paid" : "pending",
      shipping_address: shipping_address || {},
      asaas_payment_id: paymentData.id,
      coupon_code: coupon_code || null,
    }).select("id").single();

    if (orderError) {
      console.error("Order save error:", orderError);
    }

    // Log payment created
    await supabaseAdmin.from("integration_logs").insert({
      integration: "asaas",
      action: "payment_created",
      status: "success",
      details: `Pagamento ${billing_type} criado. Asaas ID: ${paymentData.id}, Status: ${paymentData.status}, Pedido: ${order?.id || "erro ao salvar"}, Valor: R$ ${Number(value).toFixed(2)}`,
    });

    // If payment was instantly confirmed (credit card), sync with Bling
    if (order?.id && (paymentData.status === "CONFIRMED" || paymentData.status === "RECEIVED")) {
      await supabaseAdmin.from("integration_logs").insert({
        integration: "asaas",
        action: "payment_instant_confirmed",
        status: "success",
        details: `Cartão aprovado instantaneamente. Pedido ${order.id} marcado como "paid".`,
      });

      try {
        await fetch(`${supabaseUrl}/functions/v1/bling-sync-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ order_id: order.id }),
        });
        console.log("Bling sync triggered for order:", order.id);
      } catch (blingErr) {
        console.error("Bling sync failed (non-fatal):", blingErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentData.id,
        status: paymentData.status,
        invoice_url: paymentData.invoiceUrl,
        pix: pixData,
        order_id: order?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("integration_logs").insert({
        integration: "asaas",
        action: "payment_creation_error",
        status: "error",
        details: message,
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
