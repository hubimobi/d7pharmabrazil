import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// FIX: SSRF protection — block private/internal IP ranges and metadata endpoints
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,      // AWS/GCP metadata
  /^::1$/,            // IPv6 loopback
  /^fc00:/i,          // IPv6 private
  /\.internal$/i,
  /\.local$/i,
];

function isSafeUrl(rawUrl: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "URL inválida" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { safe: false, reason: "Apenas URLs http/https são permitidas" };
  }

  const host = parsed.hostname.toLowerCase();
  for (const pattern of BLOCKED_HOSTS) {
    if (pattern.test(host)) {
      return { safe: false, reason: `Host bloqueado por segurança: ${host}` };
    }
  }

  return { safe: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth check — admin only
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) =>
      ["admin", "super_admin", "administrador", "suporte", "gestor", "financeiro"].includes(r.role)
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, knowledge_base_id, item_id } = await req.json();
    if (!url || !knowledge_base_id) {
      return new Response(JSON.stringify({ error: "url and knowledge_base_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FIX: SSRF check before making any network request
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = "https://" + formattedUrl;

    const safety = isSafeUrl(formattedUrl);
    if (!safety.safe) {
      return new Response(JSON.stringify({ error: safety.reason }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Crawling:", formattedUrl);

    const resp = await fetch(formattedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; D7Bot/1.0)" },
      signal: AbortSignal.timeout(15_000), // 15s timeout to avoid hanging
    });

    if (!resp.ok) {
      // FIX: update by item_id if provided, otherwise fall back to URL match
      let updateQuery = sb
        .from("ai_kb_items")
        .update({ status: "error", content: { url, error: `HTTP ${resp.status}` } })
        .eq("knowledge_base_id", knowledge_base_id)
        .eq("type", "url");
      if (item_id) {
        updateQuery = updateQuery.eq("id", item_id);
      } else {
        updateQuery = updateQuery.filter("content->>url", "eq", url);
      }
      await updateQuery;
      return new Response(JSON.stringify({ error: `Failed to fetch: ${resp.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await resp.text();

    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 50000);

    // FIX: prefer update by item_id (exact row) to avoid updating multiple rows for the same URL
    let updateQuery = sb
      .from("ai_kb_items")
      .update({ status: "trained", content: { url, crawled_content: textContent } })
      .eq("knowledge_base_id", knowledge_base_id)
      .eq("type", "url");
    if (item_id) {
      updateQuery = updateQuery.eq("id", item_id);
    } else {
      updateQuery = updateQuery.filter("content->>url", "eq", url);
    }

    const { error } = await updateQuery;
    if (error) console.error("Update error:", error);

    console.log("Crawl complete, extracted", textContent.length, "chars");

    return new Response(JSON.stringify({ success: true, chars: textContent.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Crawl error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Crawl failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
