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

    const allSessions = sessions ?? [];
    const CONCURRENCY = 5;
    let processed = 0;

    // Process in chunks to limit DB pressure while still parallelizing
    for (let i = 0; i < allSessions.length; i += CONCURRENCY) {
      const chunk = allSessions.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(chunk.map((s: any) => runSession(supabase, s)));
      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "fulfilled") {
          processed++;
        } else {
          const s = chunk[j];
          const reason = (results[j] as PromiseRejectedResult).reason;
          console.error("runSession error", s.id, reason);
          await supabase
            .from("whatsapp_flow_sessions")
            .update({ status: "error" })
            .eq("id", s.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, claimed: allSessions.length, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("flow-tick fatal:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
