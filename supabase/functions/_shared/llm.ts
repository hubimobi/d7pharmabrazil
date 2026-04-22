// Centralized LLM provider selection for all edge functions.
// Resolution order:
//   1. agent llm_override (provider name)
//   2. ai_llm_config row with is_default = true and active = true
//   3. first ai_llm_config row with active = true and provider != 'lovable'
//   4. fallback to Lovable AI Gateway
//
// Each external provider requires a Deno secret named after `api_key_name`.
// If the secret is missing, we fall through to Lovable AI.

export type LLMSelection = {
  apiUrl: string;
  apiKey: string;
  model: string;
  provider: string;
};

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_DEFAULT_MODEL = "google/gemini-2.5-flash";

function buildExternal(cfg: any): LLMSelection | null {
  if (!cfg || cfg.provider === "lovable") return null;
  const extKey = Deno.env.get(cfg.api_key_name || "");
  if (!extKey) return null;
  let url = LOVABLE_URL;
  if (cfg.provider === "xai") url = "https://api.x.ai/v1/chat/completions";
  else if (cfg.provider === "openai") url = "https://api.openai.com/v1/chat/completions";
  else if (cfg.provider === "anthropic") url = "https://api.anthropic.com/v1/messages";
  return {
    apiUrl: url,
    apiKey: extKey,
    model: cfg.default_model || LOVABLE_DEFAULT_MODEL,
    provider: cfg.provider,
  };
}

function lovable(model?: string): LLMSelection {
  return {
    apiUrl: LOVABLE_URL,
    apiKey: Deno.env.get("LOVABLE_API_KEY") || "",
    model: model || LOVABLE_DEFAULT_MODEL,
    provider: "lovable",
  };
}

export async function getActiveLLM(
  sb: any,
  opts?: {
    agentLlmOverride?: string | null;
    agentModel?: string | null;
    defaultModel?: string;
    tenantId?: string | null;
  },
): Promise<LLMSelection> {
  const { agentLlmOverride, agentModel, defaultModel, tenantId } = opts || {};

  // FIX: scope LLM config lookup to tenant so configs don't bleed between tenants
  let query = sb.from("ai_llm_config").select("*").eq("active", true);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data: configs } = await query;

  const list = (configs || []) as any[];

  // 1) agent override
  if (agentLlmOverride && agentLlmOverride !== "lovable") {
    const overrideCfg = list.find((c) => c.provider === agentLlmOverride);
    const sel = buildExternal(overrideCfg);
    if (sel) return { ...sel, model: agentModel || sel.model };
  }

  // 2) is_default
  const defaultCfg = list.find((c) => c.is_default === true);
  const defSel = buildExternal(defaultCfg);
  if (defSel) return { ...defSel, model: agentModel || defSel.model };

  // 3) first external active
  const firstExt = list.find((c) => c.provider !== "lovable");
  const firstSel = buildExternal(firstExt);
  if (firstSel) return { ...firstSel, model: agentModel || firstSel.model };

  // 4) lovable fallback
  return lovable(agentModel || defaultModel);
}

export async function logTokenUsage(
  sb: any,
  args: {
    agent_id?: string | null;
    agent_name: string;
    function_name: string;
    selection: LLMSelection;
    input_tokens: number;
    output_tokens: number;
    tenant_id?: string | null;
  },
) {
  try {
    await sb.from("ai_token_usage").insert({
      agent_id: args.agent_id ?? null,
      agent_name: args.agent_name,
      provider: args.selection.provider,
      model: args.selection.model,
      input_tokens: args.input_tokens,
      output_tokens: args.output_tokens,
      total_tokens: args.input_tokens + args.output_tokens,
      function_name: args.function_name,
      tenant_id: args.tenant_id ?? null,
    });
  } catch (e) {
    console.error("logTokenUsage error:", e);
  }
}
