import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const SUPPORTED_TABLES = [
  "store_settings", "products", "hero_banners", "promo_banners",
  "static_pages", "coupons", "product_combos", "ai_agents",
  "ai_system_prompts", "ai_llm_config", "manufacturers",
  "product_groups", "product_faqs", "product_testimonials",
  "campaign_config", "ai_knowledge_bases", "ai_kb_items",
  "customer_tags", "repurchase_goals",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Validate JWT via anon client ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: jsonHeaders });
    }

    const userId = claimsData.claims.sub as string;

    // ── 2. Check super_admin ──
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleRow } = await svc
      .from("tenant_users")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), { status: 403, headers: jsonHeaders });
    }

    // ── 3. Parse body ──
    const { backup_id } = await req.json();
    if (!backup_id || typeof backup_id !== "string") {
      return new Response(JSON.stringify({ error: "backup_id is required" }), { status: 400, headers: jsonHeaders });
    }

    // ── 4. Fetch backup record ──
    const { data: backup, error: fetchErr } = await svc
      .from("tenant_config_backups")
      .select("*")
      .eq("id", backup_id)
      .single();

    if (fetchErr || !backup) {
      return new Response(JSON.stringify({ error: "Backup not found" }), { status: 404, headers: jsonHeaders });
    }

    const tableName = backup.table_name;
    if (!SUPPORTED_TABLES.includes(tableName)) {
      return new Response(JSON.stringify({ error: `Table '${tableName}' not supported for restore` }), { status: 400, headers: jsonHeaders });
    }

    const backupData = backup.data as Record<string, unknown>;
    const recordId = backupData.id as string;
    const tenantId = backup.tenant_id as string;

    if (!recordId) {
      return new Response(JSON.stringify({ error: "Backup data missing 'id' field" }), { status: 400, headers: jsonHeaders });
    }

    // ── 5. Fetch current state for pre_restore backup ──
    const { data: currentRow } = await svc
      .from(tableName)
      .select("*")
      .eq("id", recordId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (currentRow) {
      // Save pre_restore backup
      await svc.from("tenant_config_backups").insert({
        tenant_id: tenantId,
        table_name: tableName,
        data: currentRow,
        backup_type: "pre_restore",
        notes: `Antes de restaurar backup ${backup_id}`,
      });
    }

    // ── 6. Extract restorable fields (exclude auto-generated) ──
    const {
      id: _id,
      tenant_id: _tid,
      created_at: _ca,
      updated_at: _ua,
      ...fieldsToRestore
    } = backupData;

    // ── 7. UPDATE-first approach ──
    if (currentRow) {
      const { error: updateErr } = await svc
        .from(tableName)
        .update(fieldsToRestore)
        .eq("id", recordId)
        .eq("tenant_id", tenantId);

      if (updateErr) {
        return new Response(JSON.stringify({ error: `Update failed: ${updateErr.message}` }), { status: 500, headers: jsonHeaders });
      }

      return new Response(JSON.stringify({
        success: true,
        action: "updated",
        table_name: tableName,
        record_id: recordId,
      }), { headers: jsonHeaders });
    }

    // ── 8. Fallback: INSERT if record was deleted ──
    const { error: insertErr } = await svc
      .from(tableName)
      .insert(backupData);

    if (insertErr) {
      return new Response(JSON.stringify({ error: `Insert fallback failed: ${insertErr.message}` }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      action: "inserted",
      table_name: tableName,
      record_id: recordId,
    }), { headers: jsonHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: jsonHeaders });
  }
});
