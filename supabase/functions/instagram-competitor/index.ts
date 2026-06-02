import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_BASE = "https://api.apify.com/v2";

async function runApifyActor(apifyToken: string, actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
  // Start actor run
  const runRes = await fetch(`${APIFY_BASE}/acts/${actorId}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apifyToken}`,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30_000),
  });

  if (!runRes.ok) {
    const err = await runRes.json();
    throw new Error(err.error?.message || `Apify API ${runRes.status}`);
  }

  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  // Poll for completion (max 90s)
  const maxWait = 90_000;
  const pollInterval = 3_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, pollInterval));

    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
      headers: { "Authorization": `Bearer ${apifyToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === "SUCCEEDED") {
      const datasetId = statusData.data?.defaultDatasetId;
      if (!datasetId) return [];

      const itemsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?format=json&limit=200`, {
        headers: { "Authorization": `Bearer ${apifyToken}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!itemsRes.ok) return [];
      return await itemsRes.json();
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status.toLowerCase()}`);
    }
  }

  throw new Error("Apify run timed out waiting for results");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authToken = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(authToken);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json();
  const { source, apify_token, usernames, hashtags, results_limit } = body as {
    source: "profiles" | "hashtag";
    apify_token: string;
    usernames?: string[];
    hashtags?: string[];
    results_limit?: number;
  };

  if (!apify_token) {
    return new Response(JSON.stringify({ error: "apify_token required" }), { status: 400, headers: corsHeaders });
  }

  const limit = Math.min(results_limit || 12, 50);

  try {
    // ── Scrape public profiles ──────────────────────────────────
    if (source === "profiles") {
      if (!usernames?.length) {
        return new Response(JSON.stringify({ error: "usernames required" }), { status: 400, headers: corsHeaders });
      }

      // apify/instagram-profile-scraper is lighter and faster for profiles
      const items = await runApifyActor(apify_token, "apify~instagram-profile-scraper", {
        usernames: usernames.map(u => u.replace(/^@/, "")),
        proxyConfiguration: { useApifyProxy: true },
      });

      // Normalize result shape
      const profiles = (items as Record<string, unknown>[]).map((item) => ({
        username: item.username || item.inputUrl,
        full_name: item.fullName || item.full_name || "",
        biography: item.biography || item.bio || "",
        followers: item.followersCount ?? item.followers ?? 0,
        following: item.followsCount ?? item.following ?? 0,
        posts_count: item.postsCount ?? item.mediaCount ?? item.posts ?? 0,
        is_verified: item.verified ?? item.isVerified ?? false,
        profile_pic_url: item.profilePicUrl ?? item.profilePicture ?? "",
        external_url: item.externalUrl ?? item.website ?? "",
        avg_likes: item.avgLikes ?? null,
        avg_comments: item.avgComments ?? null,
        engagement_rate: item.engagementRate ?? null,
        latest_posts: (item.latestPosts as unknown[] ?? []).slice(0, 6),
      }));

      return new Response(JSON.stringify({ ok: true, profiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Scrape hashtag posts ────────────────────────────────────
    if (source === "hashtag") {
      if (!hashtags?.length) {
        return new Response(JSON.stringify({ error: "hashtags required" }), { status: 400, headers: corsHeaders });
      }

      const items = await runApifyActor(apify_token, "apify~instagram-hashtag-scraper", {
        hashtags: hashtags.map(h => h.replace(/^#/, "")),
        resultsLimit: limit,
        proxyConfiguration: { useApifyProxy: true },
      });

      const posts = (items as Record<string, unknown>[]).map((item) => ({
        id: item.id ?? item.shortCode,
        shortcode: item.shortCode ?? item.id,
        url: item.url ?? `https://www.instagram.com/p/${item.shortCode}/`,
        caption: (item.caption as string ?? "").slice(0, 200),
        likes: item.likesCount ?? item.likes ?? 0,
        comments: item.commentsCount ?? item.comments ?? 0,
        timestamp: item.timestamp ?? item.taken_at,
        display_url: item.displayUrl ?? item.thumbnailUrl ?? "",
        owner_username: item.ownerUsername ?? item.username ?? "",
        media_type: item.type ?? item.mediaType ?? "GraphImage",
      }));

      return new Response(JSON.stringify({ ok: true, posts, hashtag: hashtags[0] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown source" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("[instagram-competitor]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
