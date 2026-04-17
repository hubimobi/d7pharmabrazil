import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const LOVABLE_IP = "185.158.133.1";

interface VerifyBody {
  domain_id: string;
}

// Use Cloudflare DNS-over-HTTPS as a reliable resolver from edge
async function resolveDNS(name: string, type: "A" | "TXT"): Promise<string[]> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Answer ?? [])
      .filter((a: { type: number }) => (type === "A" ? a.type === 1 : a.type === 16))
      .map((a: { data: string }) => a.data.replace(/^"(.*)"$/, "$1"));
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Validate caller
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
  }
  const token = auth.slice(7);
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  let body: VerifyBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: jsonHeaders });
  }
  if (!body.domain_id) {
    return new Response(JSON.stringify({ error: "missing_domain_id" }), { status: 400, headers: jsonHeaders });
  }

  // Fetch domain row (RLS enforced via service role + manual check)
  const { data: row, error: rowErr } = await supabase
    .from("tenant_domains")
    .select("id, tenant_id, domain, verification_token")
    .eq("id", body.domain_id)
    .maybeSingle();
  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: "domain_not_found" }), { status: 404, headers: jsonHeaders });
  }

  // Check that user belongs to this tenant
  const { data: membership } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("tenant_id", row.tenant_id)
    .maybeSingle();
  const { data: superRole } = await supabase
    .from("tenant_users").select("role").eq("user_id", userData.user.id).eq("role", "super_admin").maybeSingle();
  if (!membership && !superRole) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: jsonHeaders });
  }

  // Resolve A and TXT records
  const apex = row.domain.replace(/^www\./, "");
  const [aRecords, txtRecords] = await Promise.all([
    resolveDNS(row.domain, "A"),
    resolveDNS(`_lovable.${apex}`, "TXT"),
  ]);

  const aOk = aRecords.includes(LOVABLE_IP);
  const txtOk = txtRecords.some((t) => t.includes(row.verification_token ?? "___nope___"));

  let status: "verified" | "pending" | "failed" = "pending";
  let error: string | null = null;
  if (aOk && txtOk) {
    status = "verified";
  } else {
    status = "failed";
    const issues = [];
    if (!aOk) issues.push(`Registro A para ${row.domain} não aponta para ${LOVABLE_IP} (atual: ${aRecords.join(", ") || "nenhum"})`);
    if (!txtOk) issues.push(`Registro TXT em _lovable.${apex} não contém o token de verificação`);
    error = issues.join(" | ");
  }

  await supabase.from("tenant_domains").update({
    verification_status: status,
    verified_at: status === "verified" ? new Date().toISOString() : null,
    last_check_at: new Date().toISOString(),
    last_error: error,
    ssl_enabled: status === "verified",
  }).eq("id", row.id);

  return new Response(JSON.stringify({
    status, a_records: aRecords, txt_records: txtRecords, error,
  }), { headers: jsonHeaders });
});
