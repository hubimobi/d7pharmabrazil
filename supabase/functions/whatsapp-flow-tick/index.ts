import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runSession } from "../_shared/flow-engine/engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const workerId = crypto.randomUUID();
    const batchSize = 20;

    // Expira sessões vencidas em waiting_input
    await supabase.rpc("expire_flow_sessions");

    // Claim atômico
    const { data: sessions, error: claimErr } = await supabase
      .rpc("claim_flow_sessions", { _worker_id: workerId, _batch_size: batchSize });

    if (claimErr) {
      console.error("claim_flow_sessions error", claimErr);
      return new Response(JSON.stringify({ error: claimErr.message }), { status: 500, headers: corsHeaders });
    }

    let processed = 0;
    for (const s of sessions ?? []) {
      try {
        await runSession(supabase, s);
        processed++;
      } catch (e) {
        console.error("runSession error", s.id, e);
        await supabase
          .from("whatsapp_flow_sessions")
          .update({ status: "error" })
          .eq("id", s.id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, claimed: sessions?.length ?? 0, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("flow-tick fatal:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
