import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// ── Tables to clone, grouped by FK dependency order ──
const BLOCK_1 = [
  "store_settings",
  "manufacturers",
  "product_groups",
  "hero_banners",
  "promo_banners",
  "static_pages",
  "coupons",
  "customer_tags",
  "repurchase_goals",
  "ai_agents",
  "ai_knowledge_bases",
  "ai_system_prompts",
  "ai_llm_config",
  "campaign_config",
];

const BLOCK_2 = ["products", "ai_kb_items"];

const BLOCK_3 = ["product_combos", "product_faqs", "product_testimonials"];

// Fields that reference other cloned entities
const FK_FIELDS: Record<string, string[]> = {
  products: ["manufacturer"], // manufacturer name, not FK id — skip
  product_combos: ["product_ids"], // jsonb array of product UUIDs
  product_faqs: ["product_id"],
  product_testimonials: ["product_id"],
  ai_kb_items: ["knowledge_base_id"],
  ai_agent_knowledge_bases: ["agent_id", "knowledge_base_id"],
};

// Fields to strip before insert (auto-generated)
const STRIP_FIELDS = ["created_at", "updated_at"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // ── Auth: verify JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: jsonHeaders },
      );
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: jsonHeaders },
      );
    }
    const callerId = claimsData.claims.sub as string;

    // ── Service-role client ──
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Verify caller is super_admin ──
    const { data: roleRow } = await supabase
      .from("tenant_users")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Acesso negado — requer super_admin" }),
        { status: 403, headers: jsonHeaders },
      );
    }

    // ── Parse body ──
    const body = await req.json();
    const { template_tenant_id, new_name, new_slug } = body;

    if (!template_tenant_id || !new_name || !new_slug) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios: template_tenant_id, new_name, new_slug",
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // ── Verify template ──
    const { data: templateTenant } = await supabase
      .from("tenants")
      .select("id, is_template")
      .eq("id", template_tenant_id)
      .maybeSingle();

    if (!templateTenant) {
      return new Response(
        JSON.stringify({ error: "Tenant template não encontrado" }),
        { status: 404, headers: jsonHeaders },
      );
    }
    if (!templateTenant.is_template) {
      return new Response(
        JSON.stringify({
          error: "Apenas tenants com is_template=true podem ser clonados",
        }),
        { status: 403, headers: jsonHeaders },
      );
    }

    // ── Create new tenant ──
    const { data: newTenant, error: createErr } = await supabase
      .from("tenants")
      .insert({
        name: new_name,
        slug: new_slug,
        status: "active",
        plan: "free",
        cloning_status: "pending",
        template_id: template_tenant_id,
        owner_user_id: callerId,
      })
      .select("id")
      .single();

    if (createErr || !newTenant) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar tenant: ${createErr?.message}` }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const newTenantId = newTenant.id;

    // ── Log start ──
    await supabase.from("tenant_clones_log").insert({
      source_tenant_id: template_tenant_id,
      target_tenant_id: newTenantId,
      cloned_by: callerId,
      status: "running",
      tables_cloned: [],
    });

    // ── Set cloning_status = 'cloning' ──
    await supabase
      .from("tenants")
      .update({ cloning_status: "cloning" })
      .eq("id", newTenantId);

    // ── Clone tables ──
    const idMap = new Map<string, string>();
    const tablesCloned: string[] = [];
    const errors: string[] = [];

    async function cloneTable(tableName: string) {
      try {
        const { data: rows, error: fetchErr } = await supabase
          .from(tableName)
          .select("*")
          .eq("tenant_id", template_tenant_id);

        if (fetchErr) {
          errors.push(`${tableName}: fetch error — ${fetchErr.message}`);
          return;
        }

        if (!rows || rows.length === 0) {
          tablesCloned.push(tableName);
          return;
        }

        const clonedRows = rows.map((row: Record<string, unknown>) => {
          const newId = crypto.randomUUID();
          idMap.set(row.id as string, newId);

          const cloned: Record<string, unknown> = {
            ...row,
            id: newId,
            tenant_id: newTenantId,
          };

          // Remap FK fields using idMap
          const fkFields = FK_FIELDS[tableName] || [];
          for (const fk of fkFields) {
            if (fk === "product_ids" && Array.isArray(cloned[fk])) {
              // product_combos.product_ids is a jsonb array of UUIDs
              cloned[fk] = (cloned[fk] as string[]).map(
                (pid: string) => idMap.get(pid) || pid,
              );
            } else if (
              cloned[fk] &&
              typeof cloned[fk] === "string" &&
              idMap.has(cloned[fk] as string)
            ) {
              cloned[fk] = idMap.get(cloned[fk] as string);
            }
          }

          // Strip auto-generated timestamp fields
          for (const f of STRIP_FIELDS) {
            delete cloned[f];
          }

          return cloned;
        });

        const { error: insertErr } = await supabase
          .from(tableName)
          .insert(clonedRows);

        if (insertErr) {
          errors.push(`${tableName}: insert error — ${insertErr.message}`);
          return;
        }

        tablesCloned.push(tableName);
      } catch (e) {
        errors.push(`${tableName}: ${(e as Error).message}`);
      }
    }

    // Clone in dependency order
    for (const t of BLOCK_1) await cloneTable(t);
    for (const t of BLOCK_2) await cloneTable(t);
    for (const t of BLOCK_3) await cloneTable(t);

    // ── Finalize ──
    const finalStatus = errors.length > 0 ? "done_with_errors" : "done";

    await supabase
      .from("tenants")
      .update({ cloning_status: finalStatus })
      .eq("id", newTenantId);

    await supabase
      .from("tenant_clones_log")
      .update({
        status: finalStatus,
        tables_cloned: tablesCloned,
        error_message: errors.length > 0 ? errors.join("; ") : null,
        finished_at: new Date().toISOString(),
      })
      .eq("target_tenant_id", newTenantId)
      .eq("status", "running");

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: newTenantId,
        tables_cloned: tablesCloned,
        errors: errors.length > 0 ? errors : undefined,
        status: finalStatus,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (err) {
    console.error("clone-tenant error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
