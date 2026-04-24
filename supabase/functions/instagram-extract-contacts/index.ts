import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.instagram.com/v19.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Tenant
  const { data: tenantRow } = await sb.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  const tenantId: string | null = tenantRow?.id || null;

  const body = await req.json();
  const { source, access_token, ig_user_id, media_id, csv_data } = body as {
    source: "list_posts" | "comments" | "followers_csv";
    access_token?: string;
    ig_user_id?: string;
    media_id?: string;
    csv_data?: string;
  };

  try {
    // ── Source: list_posts — just return media list ──────────────
    if (source === "list_posts") {
      if (!access_token || !ig_user_id) {
        return new Response(JSON.stringify({ error: "access_token and ig_user_id required" }), { status: 400, headers: corsHeaders });
      }
      const url = `${GRAPH}/${ig_user_id}/media?fields=id,caption,media_type,timestamp,thumbnail_url,media_url&limit=20&access_token=${access_token}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Instagram API ${res.status}`);
      }
      const data = await res.json();
      return new Response(JSON.stringify({ ok: true, posts: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Source: comments — extract commenters ───────────────────
    if (source === "comments") {
      if (!access_token || !media_id) {
        return new Response(JSON.stringify({ error: "access_token and media_id required" }), { status: 400, headers: corsHeaders });
      }

      const usernames: { username: string; ig_id: string }[] = [];
      let nextUrl: string | null =
        `${GRAPH}/${media_id}/comments?fields=id,text,from,username,timestamp&limit=100&access_token=${access_token}`;

      while (nextUrl) {
        const res = await fetch(nextUrl, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || `Instagram API ${res.status}`);
        }
        const page = await res.json();
        for (const c of page.data || []) {
          const un = c.username || c.from?.username || "";
          const id = c.from?.id || c.id || "";
          if (un && !usernames.find(u => u.username === un)) {
            usernames.push({ username: un, ig_id: id });
          }
        }
        nextUrl = page.paging?.next || null;
        if (usernames.length >= 2000) break; // safety cap
      }

      // Store as contacts with ig_username as "name", no phone yet
      // They'll be enriched manually or via CSV later
      let imported = 0;
      if (tenantId) {
        const rows = usernames.map((u) => ({
          phone: `ig_${u.ig_id || u.username}`, // placeholder — no real phone
          name: `@${u.username}`,
          source: "instagram_comments",
          tenant_id: tenantId,
          notes: `Instagram: @${u.username}`,
        }));
        for (let i = 0; i < rows.length; i += 100) {
          const { error } = await sb.from("whatsapp_contacts")
            .upsert(rows.slice(i, i + 100), { onConflict: "tenant_id,phone", ignoreDuplicates: false });
          if (!error) imported += Math.min(100, rows.length - i);
        }
      }

      return new Response(JSON.stringify({ ok: true, extracted: usernames.length, imported, usernames }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Source: followers_csv — parse Instagram data export ─────
    // Instagram lets you export your account data (Settings → Your activity → Download your information)
    // The followers CSV has columns: "Account handle" (or "Username")
    if (source === "followers_csv") {
      if (!csv_data) {
        return new Response(JSON.stringify({ error: "csv_data required" }), { status: 400, headers: corsHeaders });
      }

      const lines = csv_data.trim().split("\n").filter(Boolean);
      if (lines.length < 2) {
        return new Response(JSON.stringify({ error: "CSV must have at least a header and one row" }), { status: 400, headers: corsHeaders });
      }

      const header = lines[0].toLowerCase().split(/[,;\t]/).map(s => s.trim().replace(/^["']|["']$/g, ""));
      const usernameIdx = header.findIndex(h => h.includes("username") || h.includes("handle") || h.includes("account") || h.includes("user"));
      if (usernameIdx < 0) {
        return new Response(JSON.stringify({ error: "Column 'Username' or 'Account handle' not found in CSV" }), { status: 400, headers: corsHeaders });
      }

      const extracted: string[] = [];
      for (const line of lines.slice(1)) {
        const cols = line.split(/[,;\t]/).map(s => s.trim().replace(/^["']|["']$/g, ""));
        const un = cols[usernameIdx];
        if (un) extracted.push(un.replace(/^@/, ""));
      }

      let imported = 0;
      if (tenantId && extracted.length > 0) {
        const rows = extracted.map((un) => ({
          phone: `ig_${un}`,
          name: `@${un}`,
          source: "instagram_followers",
          tenant_id: tenantId,
          notes: `Instagram follower: @${un}`,
        }));
        for (let i = 0; i < rows.length; i += 100) {
          const { error } = await sb.from("whatsapp_contacts")
            .upsert(rows.slice(i, i + 100), { onConflict: "tenant_id,phone", ignoreDuplicates: false });
          if (!error) imported += Math.min(100, rows.length - i);
        }
      }

      return new Response(JSON.stringify({ ok: true, extracted: extracted.length, imported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown source" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("[instagram-extract-contacts]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Extraction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
