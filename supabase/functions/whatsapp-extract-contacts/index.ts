import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const body = await req.json();
  const { instance_id, source, group_ids } = body as {
    instance_id: string;
    source: "groups" | "contacts" | "conversations";
    group_ids?: string[];
  };

  if (!instance_id || !source) {
    return new Response(JSON.stringify({ error: "instance_id and source required" }), { status: 400, headers: corsHeaders });
  }

  // Load instance
  const { data: instance } = await sb
    .from("whatsapp_instances")
    .select("api_url, api_key, instance_name, tenant_id")
    .eq("id", instance_id)
    .maybeSingle();

  if (!instance) {
    return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });
  }

  const evoHeaders = { "Content-Type": "application/json", apikey: instance.api_key };
  const tenantId: string = instance.tenant_id;

  try {
    let rawContacts: { phone: string; name: string }[] = [];

    // ── Source: groups ──────────────────────────────────────────
    if (source === "groups") {
      const res = await fetch(
        `${instance.api_url}/group/fetchAllGroups/${instance.instance_name}?getParticipants=true`,
        { headers: evoHeaders, signal: AbortSignal.timeout(30_000) },
      );
      if (!res.ok) throw new Error(`Evolution API error: ${res.status}`);
      const groups: any[] = await res.json();

      for (const g of groups) {
        if (group_ids && group_ids.length > 0 && !group_ids.includes(g.id)) continue;
        for (const p of g.participants || []) {
          // Evolution format: "5511999999999@s.whatsapp.net"
          const phone = String(p.id || "").split("@")[0].replace(/\D/g, "");
          if (phone.length >= 10) rawContacts.push({ phone, name: p.pushName || "" });
        }
      }

    // ── Source: contacts ────────────────────────────────────────
    } else if (source === "contacts") {
      const res = await fetch(
        `${instance.api_url}/contact/fetchContacts/${instance.instance_name}`,
        { headers: evoHeaders, signal: AbortSignal.timeout(30_000) },
      );
      if (!res.ok) throw new Error(`Evolution API error: ${res.status}`);
      const contacts: any[] = await res.json();

      for (const c of contacts) {
        const phone = String(c.id || c.remoteJid || "").split("@")[0].replace(/\D/g, "");
        if (phone.length < 10 || phone.endsWith("@g.us")) continue;
        rawContacts.push({ phone, name: c.pushName || c.verifiedName || c.name || "" });
      }

    // ── Source: conversations ───────────────────────────────────
    } else if (source === "conversations") {
      const { data: rows } = await sb
        .from("whatsapp_message_log")
        .select("contact_phone, contact_name")
        .eq("tenant_id", tenantId)
        .eq("instance_id", instance_id)
        .order("created_at", { ascending: false })
        .limit(5000);

      const seen = new Set<string>();
      for (const r of rows || []) {
        const phone = String(r.contact_phone || "").replace(/\D/g, "");
        if (!phone || seen.has(phone)) continue;
        seen.add(phone);
        rawContacts.push({ phone, name: r.contact_name || "" });
      }
    }

    // ── Deduplicate ─────────────────────────────────────────────
    const phoneMap = new Map<string, string>();
    for (const c of rawContacts) {
      const phone = c.phone.replace(/\D/g, "");
      if (!phoneMap.has(phone) || c.name) phoneMap.set(phone, c.name);
    }

    // ── Upsert in batches of 100 ────────────────────────────────
    const toInsert = Array.from(phoneMap.entries()).map(([phone, name]) => ({
      phone,
      name: name || phone,
      source: source === "groups" ? "whatsapp_group" : source === "contacts" ? "whatsapp_device" : "whatsapp_conversations",
      tenant_id: tenantId,
    }));

    let imported = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error } = await sb
        .from("whatsapp_contacts")
        .upsert(batch, { onConflict: "tenant_id,phone", ignoreDuplicates: false });
      if (!error) imported += batch.length;
    }

    // For "groups" source, also return the group list so the UI can show checkboxes
    let groupList: { id: string; subject: string; size: number }[] | undefined;
    if (source === "groups" && !group_ids) {
      const res = await fetch(
        `${instance.api_url}/group/fetchAllGroups/${instance.instance_name}?getParticipants=false`,
        { headers: evoHeaders, signal: AbortSignal.timeout(20_000) },
      );
      if (res.ok) {
        const g: any[] = await res.json();
        groupList = g.map((gr) => ({ id: gr.id, subject: gr.subject || gr.id, size: gr.size || 0 }));
      }
    }

    return new Response(
      JSON.stringify({ ok: true, imported, total: toInsert.length, groups: groupList }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[whatsapp-extract-contacts]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Extraction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
