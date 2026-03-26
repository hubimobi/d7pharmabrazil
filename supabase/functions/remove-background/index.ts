import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const base64 = base64Encode(new Uint8Array(imgBuffer));
    const mimeType = imgResponse.headers.get("content-type") || "image/png";

    // Call Lovable AI image editing model
    const aiResponse = await fetch(
      "https://ai-gateway.lovable.dev/v1/chat/completions",
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
                  text: "Remove the background from this image completely. Output only the subject/product with a transparent background as a PNG image. Do not add any text or watermarks.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(
        `AI API error [${aiResponse.status}]: ${errorText.slice(0, 500)}`
      );
    }

    const aiData = await aiResponse.json();

    // Extract image from response - try multiple formats
    let resultBase64: string | null = null;
    let resultMime = "image/png";

    const content = aiData.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      // Check if content contains base64 image data
      const b64Match = content.match(
        /data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)/
      );
      if (b64Match) {
        resultMime = b64Match[1];
        resultBase64 = b64Match[2];
      }
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "image" && part.data) {
          resultBase64 = part.data;
          break;
        }
        if (part.type === "image_url" && part.image_url?.url) {
          const match = part.image_url.url.match(
            /data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)/
          );
          if (match) {
            resultMime = match[1];
            resultBase64 = match[2];
            break;
          }
        }
      }
    }

    // Also check for inline_data format (Gemini specific)
    if (!resultBase64 && aiData.choices?.[0]?.message?.content) {
      const parts = aiData.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.inline_data?.data) {
            resultBase64 = part.inline_data.data;
            resultMime = part.inline_data.mime_type || "image/png";
            break;
          }
        }
      }
    }

    if (!resultBase64) {
      console.error("AI response structure:", JSON.stringify(aiData).slice(0, 1000));
      return new Response(
        JSON.stringify({
          error: "Não foi possível processar a imagem. Tente novamente.",
          details: "Could not extract image from AI response",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        image_base64: resultBase64,
        mime_type: resultMime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Remove background error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
