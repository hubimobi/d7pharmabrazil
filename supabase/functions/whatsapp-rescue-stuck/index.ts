// Recupera mensagens travadas em status 'processing' por mais de N minutos.
// Roda periodicamente (ex: a cada 5 min) via cron para garantir que workers
// que crasharam (timeout da edge function, OOM, etc) não deixem mensagens presas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // 5 min é o default: se um worker fica claimado mais que isso,
    // assumimos que crashou e devolvemos pra pending (incrementando retry_count).
    const stuckMinutes = 5;
    const { data, error } = await supabase.rpc("rescue_stuck_whatsapp_messages", {
      _stuck_minutes: stuckMinutes,
    });

    if (error) {
      console.error("rescue error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      rescued: data ?? 0,
      stuck_threshold_minutes: stuckMinutes,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("whatsapp-rescue-stuck error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
