
CREATE TABLE public.ai_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  agent_name text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT '',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  function_name text NOT NULL DEFAULT 'ai-agent-chat',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage token usage" ON public.ai_token_usage
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Service role can insert token usage" ON public.ai_token_usage
  FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX idx_ai_token_usage_created_at ON public.ai_token_usage (created_at);
CREATE INDEX idx_ai_token_usage_agent_id ON public.ai_token_usage (agent_id);
