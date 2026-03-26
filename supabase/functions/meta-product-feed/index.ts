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

    // Fetch active products
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch store settings for brand/store info
    const { data: settings } = await supabase
      .from("store_settings")
      .select("store_name")
      .limit(1)
      .single();

    const storeName = settings?.store_name || "D7 Pharma Brazil";
    const baseUrl = req.headers.get("origin") || "https://d7pharmabrazil.lovable.app";

    // Check format param: xml (default) or csv
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "xml";

    if (format === "csv") {
      return generateCSV(products || [], baseUrl, storeName);
    }

    return generateXML(products || [], baseUrl, storeName);
  } catch (err: any) {
    console.error("Error generating feed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateXML(products: any[], baseUrl: string, storeName: string): Response {
  const items = products.map((p) => {
    const link = `${baseUrl}/produto/${p.slug}`;
    const imageUrl = p.image_url || `${baseUrl}/placeholder.svg`;
    const availability = p.stock > 0 ? "in stock" : "out of stock";
    const condition = "new";
    const brand = p.manufacturer || storeName;
    const price = `${p.price.toFixed(2)} BRL`;
    const salePrice = p.original_price > p.price ? `${p.price.toFixed(2)} BRL` : "";
    const originalPrice = p.original_price > p.price ? `${p.original_price.toFixed(2)} BRL` : "";

    // Extra images
    const extraImages = Array.isArray(p.extra_images)
      ? p.extra_images
          .filter((img: string) => img && img.trim())
          .map((img: string) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
          .join("\n")
      : "";

    return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.short_description || p.description || "")}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
${extraImages}
      <g:availability>${availability}</g:availability>
      <g:condition>${condition}</g:condition>
      ${originalPrice ? `<g:price>${escapeXml(originalPrice)}</g:price>` : `<g:price>${escapeXml(price)}</g:price>`}
      ${salePrice ? `<g:sale_price>${escapeXml(salePrice)}</g:sale_price>` : ""}
      <g:brand>${escapeXml(brand)}</g:brand>
      ${p.gtin ? `<g:gtin>${escapeXml(p.gtin)}</g:gtin>` : `<g:identifier_exists>no</g:identifier_exists>`}
      ${p.sku ? `<g:mpn>${escapeXml(p.sku)}</g:mpn>` : ""}
      <g:product_type>Health &amp; Beauty</g:product_type>
      <g:shipping_weight>${p.weight || 0.5} kg</g:shipping_weight>
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(storeName)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Catálogo de produtos - ${escapeXml(storeName)}</description>
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      ...corsHeaders,
    },
  });
}

function generateCSV(products: any[], baseUrl: string, _storeName: string): Response {
  const headers = [
    "id", "title", "description", "availability", "condition", "price",
    "sale_price", "link", "image_link", "brand", "gtin", "mpn",
    "product_type", "shipping_weight"
  ];

  const rows = products.map((p) => {
    const link = `${baseUrl}/produto/${p.slug}`;
    const imageUrl = p.image_url || `${baseUrl}/placeholder.svg`;
    const availability = p.stock > 0 ? "in stock" : "out of stock";
    const brand = p.manufacturer || "D7 Pharma Brazil";
    const price = p.original_price > p.price
      ? `${p.original_price.toFixed(2)} BRL`
      : `${p.price.toFixed(2)} BRL`;
    const salePrice = p.original_price > p.price ? `${p.price.toFixed(2)} BRL` : "";

    return [
      p.id,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.short_description || "").replace(/"/g, '""')}"`,
      availability,
      "new",
      price,
      salePrice,
      link,
      imageUrl,
      brand,
      p.gtin || "",
      p.sku || "",
      "Health & Beauty",
      `${p.weight || 0.5} kg`,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=meta-product-feed.csv",
      "Cache-Control": "public, max-age=3600",
      ...corsHeaders,
    },
  });
}
