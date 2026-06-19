import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { getTenantCredentials, resolveTenantId, DEFAULT_TENANT_ID } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

const GHL_API = "https://services.leadconnectorhq.com";
const MAX_CONTACTS = 5000;

interface GHLCreds { api_key: string; location_id: string; }

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  fullNameLowerCase?: string;
  name?: string;
  phone?: string;
  email?: string;
  tags?: string[];
}

async function getGhlCreds(supabase: ReturnType<typeof createClient>, tenantId: string): Promise<{ apiKey: string; locationId: string }> {
  // 1. Check for corrida-verde-specific env vars first
  const cvApiKey = Deno.env.get("CORRIDA_VERDE_GHL_API_KEY");
  const cvLocationId = Deno.env.get("CORRIDA_VERDE_GHL_LOCATION_ID");
  if (cvApiKey && cvLocationId) return { apiKey: cvApiKey, locationId: cvLocationId };

  // 2. Fall back to tenant GHL credentials
  const tenantCreds = await getTenantCredentials<GHLCreds>(supabase, tenantId, "ghl");
  if (tenantCreds?.api_key && tenantCreds?.location_id) {
    return { apiKey: tenantCreds.api_key, locationId: tenantCreds.location_id };
  }

  // 3. Global env vars
  const apiKey = Deno.env.get("GHL_API_KEY");
  const locationId = Deno.env.get("GHL_LOCATION_ID");
  if (apiKey && locationId) return { apiKey, locationId };

  throw new Error("GHL não configurado. Configure as credenciais em Integrações ou defina CORRIDA_VERDE_GHL_API_KEY e CORRIDA_VERDE_GHL_LOCATION_ID.");
}

function buildName(c: GHLContact): string {
  if (c.name) return c.name.trim();
  const parts = [c.firstName, c.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ").trim();
  if (c.fullNameLowerCase) {
    return c.fullNameLowerCase
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return c.email?.split("@")[0] || `Participante ${c.id.slice(0, 6)}`;
}

async function fetchPage(
  apiKey: string,
  locationId: string,
  skip: number,
  limit: number,
  tag?: string,
): Promise<{ contacts: GHLContact[]; total: number }> {
  const url = new URL(`${GHL_API}/contacts/`);
  url.searchParams.set("locationId", locationId);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("skip", String(skip));
  // GHL supports `tag` query param for exact tag matching
  if (tag) url.searchParams.set("tag", tag);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: "2021-07-28",
    },
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body?.message || body?.msg || JSON.stringify(body);
    throw new Error(`GHL API erro ${res.status}: ${msg}`);
  }

  return {
    contacts: body.contacts ?? [],
    total: body.meta?.total ?? body.total ?? 0,
  };
}

async function fetchAllContacts(
  apiKey: string,
  locationId: string,
  tag?: string,
): Promise<GHLContact[]> {
  const limit = 100;
  const all: GHLContact[] = [];

  const { contacts: first, total } = await fetchPage(apiKey, locationId, 0, limit, tag);
  all.push(...first);

  // Fetch remaining pages concurrently (max 5 at a time to avoid rate limiting)
  const remaining = Math.min(total, MAX_CONTACTS) - limit;
  if (remaining > 0) {
    const pages: number[] = [];
    for (let skip = limit; skip < Math.min(total, MAX_CONTACTS); skip += limit) {
      pages.push(skip);
    }

    // Batches of 5
    for (let i = 0; i < pages.length; i += 5) {
      const batch = pages.slice(i, i + 5);
      const results = await Promise.all(
        batch.map((skip) => fetchPage(apiKey, locationId, skip, limit, tag).then((r) => r.contacts)),
      );
      results.forEach((c) => all.push(...c));
    }
  }

  return all;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, supabaseKey);

    // Auth — require logged-in admin user OR a special event-secret header
    const eventSecret = Deno.env.get("CORRIDA_VERDE_SECRET");
    const requestSecret = req.headers.get("x-event-secret");

    let authed = false;

    if (eventSecret && requestSecret === eventSecret) {
      authed = true;
    } else {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const sbUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await sbUser.auth.getUser(token);
        if (user) {
          const { data: roles } = await sbAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          const adminRoles = ["admin", "super_admin", "administrador", "suporte", "gestor", "financeiro"];
          if ((roles ?? []).some((r: { role: string }) => adminRoles.includes(r.role))) {
            authed = true;
          }
        }
      }
    }

    if (!authed) {
      return json({ error: "Não autorizado. Faça login como admin." }, 401);
    }

    // Parse optional body params
    let tag = Deno.env.get("CORRIDA_VERDE_GHL_TAG") || "corrida-verde";
    let overrideLocationId: string | undefined;

    if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
      try {
        const body = await req.json();
        if (body.tag) tag = body.tag;
        if (body.location_id) overrideLocationId = body.location_id;
      } catch (_) { /* ignore */ }
    }

    const tenantId = await resolveTenantId(req);
    const creds = await getGhlCreds(sbAdmin, tenantId);

    const locationId = overrideLocationId || creds.locationId;
    const apiKey = creds.apiKey;

    const rawContacts = await fetchAllContacts(apiKey, locationId, tag || undefined);

    // Filter out contacts without a name
    const participants = rawContacts
      .map((c) => ({
        id: c.id,
        name: buildName(c),
        phone: c.phone?.replace(/\D/g, "").slice(-11) || "",
        email: c.email || "",
        tags: c.tags || [],
      }))
      .filter((p) => p.name.length > 1);

    return json({
      total: participants.length,
      tag_used: tag || null,
      location_id: locationId,
      participants,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("corrida-verde-contacts error:", message);
    return json({ error: message }, 500);
  }
});
