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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = "https://d7pharmabrazil.lovable.app";

    // Fetch active products
    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("active", true)
      .order("created_at");

    // Fetch static pages
    const { data: pages } = await supabase
      .from("static_pages")
      .select("slug, updated_at");

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/produtos</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    if (products) {
      for (const p of products) {
        const lastmod = p.updated_at ? p.updated_at.split("T")[0] : now;
        xml += `
  <url>
    <loc>${baseUrl}/produto/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    if (pages) {
      for (const pg of pages) {
        const lastmod = pg.updated_at ? pg.updated_at.split("T")[0] : now;
        xml += `
  <url>
    <loc>${baseUrl}/pagina/${pg.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
});
