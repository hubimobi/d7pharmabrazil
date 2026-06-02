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

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json();
  const { source, access_token, ig_user_id, media_id, period } = body as {
    source: "account" | "posts" | "post_detail";
    access_token: string;
    ig_user_id?: string;
    media_id?: string;
    period?: "day" | "week" | "days_28" | "month" | "lifetime";
  };

  if (!access_token) {
    return new Response(JSON.stringify({ error: "access_token required" }), { status: 400, headers: corsHeaders });
  }

  try {
    // ── Account-level insights ──────────────────────────────────
    if (source === "account") {
      if (!ig_user_id) {
        return new Response(JSON.stringify({ error: "ig_user_id required" }), { status: 400, headers: corsHeaders });
      }

      // Profile basic info
      const profileRes = await fetch(
        `${GRAPH}/${ig_user_id}?fields=name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${access_token}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      if (!profileRes.ok) {
        const err = await profileRes.json();
        throw new Error(err.error?.message || `Graph API ${profileRes.status}`);
      }
      const profile = await profileRes.json();

      // Account insights (reach, impressions, profile_views)
      const insightMetrics = "follower_count,impressions,reach,profile_views";
      const insightPeriod = period || "day";
      const since = Math.floor(Date.now() / 1000) - 30 * 24 * 3600; // last 30 days
      const until = Math.floor(Date.now() / 1000);

      const insightsRes = await fetch(
        `${GRAPH}/${ig_user_id}/insights?metric=${insightMetrics}&period=${insightPeriod}&since=${since}&until=${until}&access_token=${access_token}`,
        { signal: AbortSignal.timeout(15_000) }
      );

      let insights: Record<string, number[]> = {};
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        for (const metric of (insightsData.data || [])) {
          insights[metric.name] = (metric.values || []).map((v: { value: number }) => v.value);
        }
      }

      return new Response(JSON.stringify({ ok: true, profile, insights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── List posts with basic metrics ──────────────────────────
    if (source === "posts") {
      if (!ig_user_id) {
        return new Response(JSON.stringify({ error: "ig_user_id required" }), { status: 400, headers: corsHeaders });
      }

      const mediaRes = await fetch(
        `${GRAPH}/${ig_user_id}/media?fields=id,caption,media_type,timestamp,thumbnail_url,media_url,like_count,comments_count&limit=50&access_token=${access_token}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      if (!mediaRes.ok) {
        const err = await mediaRes.json();
        throw new Error(err.error?.message || `Graph API ${mediaRes.status}`);
      }
      const mediaData = await mediaRes.json();
      const posts = mediaData.data || [];

      return new Response(JSON.stringify({ ok: true, posts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Single post detailed insights ──────────────────────────
    if (source === "post_detail") {
      if (!media_id) {
        return new Response(JSON.stringify({ error: "media_id required" }), { status: 400, headers: corsHeaders });
      }

      // Basic post info
      const postRes = await fetch(
        `${GRAPH}/${media_id}?fields=id,caption,media_type,timestamp,thumbnail_url,media_url,like_count,comments_count&access_token=${access_token}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      if (!postRes.ok) {
        const err = await postRes.json();
        throw new Error(err.error?.message || `Graph API ${postRes.status}`);
      }
      const post = await postRes.json();

      // Post insights (reach, impressions, saves, shares, engagement)
      const postInsightsRes = await fetch(
        `${GRAPH}/${media_id}/insights?metric=impressions,reach,saved,shares,likes,comments,follows,profile_visits,total_interactions&access_token=${access_token}`,
        { signal: AbortSignal.timeout(15_000) }
      );

      let postInsights: Record<string, number> = {};
      if (postInsightsRes.ok) {
        const insightsData = await postInsightsRes.json();
        for (const metric of (insightsData.data || [])) {
          postInsights[metric.name] = metric.values?.[0]?.value ?? metric.value ?? 0;
        }
      }

      return new Response(JSON.stringify({ ok: true, post, insights: postInsights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown source" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("[instagram-insights]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
