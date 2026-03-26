import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    const appKey = Deno.env.get("TIKTOK_APP_KEY");
    const appSecret = Deno.env.get("TIKTOK_APP_SECRET");

    if (!appKey || !appSecret) {
      throw new Error("TikTok Shop credentials not configured");
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://auth.tiktok-shops.com/api/v2/token/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret,
        auth_code: code,
        grant_type: "authorized_code",
      }),
    });

    const tokenData = await tokenRes.json();
    console.log("TikTok token response:", JSON.stringify(tokenData));

    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      throw new Error(`TikTok auth failed: ${tokenData.message || JSON.stringify(tokenData)}`);
    }

    const { access_token, refresh_token, access_token_expire_in } = tokenData.data;

    // Calculate expiry
    const expiresAt = new Date(Date.now() + access_token_expire_in * 1000).toISOString();

    // Get shop info
    let shopId = "";
    let shopName = "";
    try {
      const shopRes = await fetch(
        `https://open-api.tiktokglobalshop.com/authorization/202309/shops?app_key=${appKey}&timestamp=${Math.floor(Date.now() / 1000)}`,
        {
          headers: {
            "x-tts-access-token": access_token,
            "Content-Type": "application/json",
          },
        }
      );
      const shopData = await shopRes.json();
      if (shopData.data?.shops?.length > 0) {
        shopId = shopData.data.shops[0].id || "";
        shopName = shopData.data.shops[0].name || "";
      }
    } catch (e) {
      console.warn("Could not fetch shop info:", e);
    }

    // Save token to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete old tokens and insert new one
    await supabase.from("tiktok_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insertError } = await supabase.from("tiktok_tokens").insert({
      access_token,
      refresh_token,
      shop_id: shopId,
      shop_name: shopName,
      expires_at: expiresAt,
    });

    if (insertError) throw insertError;

    // Redirect back to admin
    const redirectUrl = state || "/admin/integracoes";
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    console.error("TikTok callback error:", err);
    return new Response(
      `<html><body><h2>Erro na autenticação TikTok Shop</h2><p>${err.message}</p><a href="/admin/integracoes">Voltar</a></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  }
});
