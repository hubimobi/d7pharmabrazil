import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Fetch the original image
    const imgResponse = await fetch(image_url);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: ${imgResponse.status}`);
    }
    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);
    
    // If image is larger than 500KB, we'll send URL directly instead of base64
    const imageSizeKB = imgBytes.length / 1024;
    console.log(`Image size: ${imageSizeKB.toFixed(0)}KB`);

    // Build the image content - use URL for large images, base64 for small ones
    let imageContent: any;
    if (imageSizeKB > 500) {
      // For large images, pass the URL directly (let the AI gateway handle it)
      imageContent = {
        type: "image_url",
        image_url: { url: image_url },
      };
    } else {
      const base64 = base64Encode(imgBytes);
      const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
      imageContent = {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      };
    }

    // Call Lovable AI image editing model
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Remove the background from this image. Return ONLY the image with transparent background as PNG. No text.",
                },
                imageContent,
              ],
            },
          ],
          modalities: ["image", "text"],
          max_tokens: 8192,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`AI API error [${aiResponse.status}]:`, errorText.slice(0, 500));
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error [${aiResponse.status}]`);
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices?.[0]?.message;
    
    console.log("AI finish_reason:", aiData.choices?.[0]?.finish_reason);
    console.log("Has images array:", !!message?.images);
    console.log("Content type:", typeof message?.content);

    // Extract image from response
    let resultBase64: string | null = null;
    let resultMime = "image/png";

    // Method 1: images array (Lovable AI gateway format)
    if (message?.images && Array.isArray(message.images)) {
      for (const img of message.images) {
        const url = img.image_url?.url || img.url;
        if (url) {
          const match = url.match(/data:(image\/[a-z]+);base64,(.+)/s);
          if (match) {
            resultMime = match[1];
            resultBase64 = match[2].replace(/[\n\r\s]/g, "");
            break;
          }
        }
      }
    }

    // Method 2: content string with embedded base64
    if (!resultBase64 && typeof message?.content === "string") {
      const b64Match = message.content.match(/data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)/);
      if (b64Match) {
        resultMime = b64Match[1];
        resultBase64 = b64Match[2];
      }
    }

    // Method 3: content array with image parts
    if (!resultBase64 && Array.isArray(message?.content)) {
      for (const part of message.content) {
        const url = part.image_url?.url;
        if (url) {
          const match = url.match(/data:(image\/[a-z]+);base64,(.+)/s);
          if (match) {
            resultMime = match[1];
            resultBase64 = match[2].replace(/[\n\r\s]/g, "");
            break;
          }
        }
      }
    }

    if (!resultBase64) {
      // Log full structure for debugging
      const debugInfo = {
        hasChoices: !!aiData.choices,
        finishReason: aiData.choices?.[0]?.finish_reason,
        hasImages: !!message?.images,
        imagesCount: message?.images?.length,
        contentType: typeof message?.content,
        contentIsArray: Array.isArray(message?.content),
        contentPreview: typeof message?.content === "string" 
          ? message.content.slice(0, 200) 
          : Array.isArray(message?.content) 
            ? JSON.stringify(message.content.map((p: any) => ({ type: p.type })))
            : "unknown",
      };
      console.error("Could not extract image. Debug:", JSON.stringify(debugInfo));
      
      return new Response(
        JSON.stringify({
          error: "Não foi possível processar a imagem. O modelo não retornou uma imagem. Tente com uma imagem menor.",
          details: "Could not extract image from AI response",
          debug: debugInfo,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ image_base64: resultBase64, mime_type: resultMime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Remove background error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
