import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, productName, productDescription, benefits, faqs } = await req.json();

    if (!question || !productName) {
      return new Response(JSON.stringify({ error: "question and productName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context from product data
    const faqText = (faqs || []).map((f: any) => `P: ${f.q}\nR: ${f.a}`).join("\n\n");
    const benefitsText = (benefits || []).join(", ");

    // Strip HTML tags from description for cleaner context
    const cleanDesc = (productDescription || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const systemPrompt = `Você é um especialista em produtos da D7 Pharma Brazil. Responda APENAS com base nas informações fornecidas sobre o produto. Se a pergunta não puder ser respondida com as informações disponíveis, diga educadamente que não possui essa informação e sugira entrar em contato pelo WhatsApp.

Produto: ${productName}

Descrição: ${cleanDesc}

Benefícios: ${benefitsText}

${faqText ? `Perguntas Frequentes:\n${faqText}` : ""}

Regras:
- Responda em português brasileiro
- Seja conciso e direto (máximo 3-4 frases)
- Não invente informações que não estejam nos dados acima
- Seja amigável e profissional`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas perguntas, tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Serviço temporariamente indisponível." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Não foi possível gerar uma resposta.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-qa error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
