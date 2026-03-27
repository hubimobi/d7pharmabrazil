
-- Knowledge Bases
CREATE TABLE public.ai_knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage knowledge bases" ON public.ai_knowledge_bases FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Knowledge Base Items
CREATE TABLE public.ai_kb_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES public.ai_knowledge_bases(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'faq',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_kb_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage kb items" ON public.ai_kb_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Agent <-> Knowledge Base junction
CREATE TABLE public.ai_agent_knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  knowledge_base_id uuid NOT NULL REFERENCES public.ai_knowledge_bases(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, knowledge_base_id)
);
ALTER TABLE public.ai_agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage agent kb links" ON public.ai_agent_knowledge_bases FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Chat Messages
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  feedback text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chat messages" ON public.ai_chat_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all chat messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (is_admin());

-- Meetings
CREATE TABLE public.ai_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  agent_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text DEFAULT '',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own meetings" ON public.ai_meetings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all meetings" ON public.ai_meetings FOR SELECT TO authenticated USING (is_admin());

-- LLM Config
CREATE TABLE public.ai_llm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'lovable',
  api_key_name text NOT NULL DEFAULT '',
  default_model text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_llm_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage llm config" ON public.ai_llm_config FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Add allowed_panels to ai_agents
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS allowed_panels jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS llm_override text DEFAULT NULL;
