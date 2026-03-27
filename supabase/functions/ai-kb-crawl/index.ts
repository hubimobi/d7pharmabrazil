import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, knowledge_base_id } = await req.json();
    if (!url || !knowledge_base_id) {
      return new Response(JSON.stringify({ error: "url and knowledge_base_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Simple fetch and extract text
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = "https://" + formattedUrl;

    console.log("Crawling:", formattedUrl);

    const resp = await fetch(formattedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; D7Bot/1.0)" },
    });

    if (!resp.ok) {
      await sb.from("ai_kb_items").update({ status: "error", content: { url, error: `HTTP ${resp.status}` } })
        .eq("knowledge_base_id", knowledge_base_id).eq("type", "url")
        .filter("content->url", "eq", url);
      return new Response(JSON.stringify({ error: `Failed to fetch: ${resp.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await resp.text();

    // Basic HTML to text extraction
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
      .substring(0, 50000); // Limit to ~50k chars

    // Update the KB item
    const { error } = await sb.from("ai_kb_items")
      .update({ status: "trained", content: { url, crawled_content: textContent } })
      .eq("knowledge_base_id", knowledge_base_id)
      .eq("type", "url")
      .filter("content->>url", "eq", url);

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
