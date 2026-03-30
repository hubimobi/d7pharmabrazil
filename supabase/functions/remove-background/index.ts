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
    // Auth check - admin only
    const sbAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sbAuth.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await sbAuth.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor","financeiro"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
    
    const imageSizeKB = imgBytes.length / 1024;
    console.log(`Image size: ${imageSizeKB.toFixed(0)}KB`);

    // Build the image content
    let imageContent: any;
    if (imageSizeKB > 500) {
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

    // Step 1: Use AI to place the subject on a solid bright green (#00FF00) background
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
                  text: "Remove the background from this product image and replace it with a perfectly uniform solid bright green color (#00FF00). The entire background must be exactly #00FF00 with no gradients, shadows, or variations. Keep only the product/subject with all its details intact. Output as PNG image.",
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

    // Extract image from response
    let resultBase64: string | null = null;
    let resultMime = "image/png";

    // Method 1: images array
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

    // Method 2: content string
    if (!resultBase64 && typeof message?.content === "string") {
      const b64Match = message.content.match(/data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)/);
      if (b64Match) {
        resultMime = b64Match[1];
        resultBase64 = b64Match[2];
      }
    }

    // Method 3: content array
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
      const debugInfo = {
        hasChoices: !!aiData.choices,
        finishReason: aiData.choices?.[0]?.finish_reason,
        hasImages: !!message?.images,
        imagesCount: message?.images?.length,
        contentType: typeof message?.content,
        contentIsArray: Array.isArray(message?.content),
      };
      console.error("Could not extract image. Debug:", JSON.stringify(debugInfo));
      
      return new Response(
        JSON.stringify({
          error: "Não foi possível processar a imagem. Tente com uma imagem menor.",
          debug: debugInfo,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Convert green background to transparency using canvas-like pixel manipulation
    // Decode the base64 image and use a simple approach via a second pass
    // We'll use the Deno ImageMagick or manual pixel replacement
    
    // Since Deno doesn't have Canvas natively, we'll use a pragmatic approach:
    // Decode PNG, find green pixels, make them transparent
    // For simplicity and reliability, use a WebAssembly-free approach with raw pixel manipulation
    
    // Actually, let's use the built-in OffscreenCanvas or a simpler method
    // We'll convert using a second AI call that explicitly outputs with transparency
    // OR we process the green-screen image server-side
    
    // Best approach: Use ImageScript (pure TypeScript image library for Deno)
    const { Image } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");
    
    // Decode the AI-generated image
    const greenScreenBytes = Uint8Array.from(atob(resultBase64), c => c.charCodeAt(0));
    const img = await Image.decode(greenScreenBytes);
    
    // Replace bright green pixels with transparent
    // Use a tolerance-based approach to catch near-green pixels
    const tolerance = 80; // color distance tolerance
    
    for (let x = 0; x < img.width; x++) {
      for (let y = 0; y < img.height; y++) {
        const pixel = img.getPixelAt(x + 1, y + 1); // ImageScript is 1-indexed
        const r = (pixel >> 24) & 0xFF;
        const g = (pixel >> 16) & 0xFF;
        const b = (pixel >> 8) & 0xFF;
        
        // Check if pixel is close to bright green (#00FF00)
        // Green channel should be high, red and blue should be low
        const distR = r;
        const distG = 255 - g;
        const distB = b;
        const distance = Math.sqrt(distR * distR + distG * distG + distB * distB);
        
        if (distance < tolerance) {
          // Make transparent (RGBA with alpha=0)
          img.setPixelAt(x + 1, y + 1, 0x00000000);
        } else if (distance < tolerance + 30) {
          // Semi-transparent edge for smoother cutout
          const alpha = Math.round(((distance - tolerance) / 30) * 255);
          const newPixel = ((r & 0xFF) << 24) | ((g & 0xFF) << 16) | ((b & 0xFF) << 8) | (alpha & 0xFF);
          img.setPixelAt(x + 1, y + 1, newPixel);
        }
      }
    }
    
    // Encode as PNG with transparency
    const pngBytes = await img.encode(1); // PNG format
    const finalBase64 = base64Encode(pngBytes);

    console.log("Background removed successfully with green-screen technique");

    return new Response(
      JSON.stringify({ image_base64: finalBase64, mime_type: "image/png" }),
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
