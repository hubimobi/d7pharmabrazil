// Asaas API key resolver per tenant.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_TENANT_ID } from "./tenant-credentials.ts";

export interface AsaasCreds {
  api_key: string;
  environment?: "production" | "sandbox";
}

/**
 * Returns Asaas api_key for tenant.
 * Falls back to ASAAS_API_KEY env only for DEFAULT tenant (matriz).
 */
export async function getAsaasApiKey(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const { data: row } = await supabase
    .from("tenant_integrations")
    .select("credentials, active")
    .eq("tenant_id", tenantId)
    .eq("provider", "asaas")
    .maybeSingle();

  if (row?.active && (row.credentials as AsaasCreds)?.api_key) {
    return (row.credentials as AsaasCreds).api_key;
  }

  if (tenantId === DEFAULT_TENANT_ID) {
    const env = Deno.env.get("ASAAS_API_KEY");
    if (env) return env;
  }

  throw new Error("Asaas não configurado para este tenant.");
}
