
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature numeric NOT NULL DEFAULT 0.7,
  active boolean NOT NULL DEFAULT false,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  icon text NOT NULL DEFAULT 'Bot',
  color text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai agents"
  ON public.ai_agents FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can view active agents"
  ON public.ai_agents FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default agents
INSERT INTO public.ai_agents (name, slug, description, system_prompt, icon, color) VALUES
('SDR', 'sdr', 'Qualificação de leads e prospecção ativa', 'Você é um SDR especializado em suplementos farmacêuticos. Sua função é qualificar leads, identificar necessidades e agendar apresentações. Seja proativo, faça perguntas abertas e registre informações relevantes.', 'UserPlus', '#10b981'),
('Vendedor', 'vendedor', 'Fechamento de vendas e negociação', 'Você é um vendedor consultivo de suplementos farmacêuticos. Conheça profundamente os produtos, apresente benefícios, contorne objeções e conduza o cliente ao fechamento. Use técnicas de persuasão ética.', 'ShoppingBag', '#f59e0b'),
('Recuperação de Venda', 'recuperacao-venda', 'Recuperação de carrinhos abandonados e vendas perdidas', 'Você é especialista em recuperação de vendas. Identifique o motivo do abandono, ofereça incentivos quando apropriado e reconduza o cliente à compra. Seja empático e não pressione.', 'RotateCcw', '#ef4444'),
('Pós Vendas', 'pos-vendas', 'Sucesso do cliente e acompanhamento pós-compra', 'Você é responsável pelo sucesso do cliente após a compra. Acompanhe o uso do produto, colete feedback, resolva problemas e identifique oportunidades de recompra. Seja atencioso e proativo.', 'Heart', '#ec4899'),
('UpSell', 'upsell', 'Cross-sell e up-sell inteligente', 'Você é especialista em upsell de suplementos. Analise o histórico de compras, sugira produtos complementares e apresente combos vantajosos. Foque no valor agregado para o cliente.', 'TrendingUp', '#8b5cf6'),
('Suporte Atendimento', 'suporte', 'Atendimento ao cliente e suporte técnico', 'Você é um agente de suporte ao cliente. Responda dúvidas sobre produtos, pedidos, entregas e trocas. Seja paciente, claro e resolva problemas rapidamente. Escale para humano quando necessário.', 'Headphones', '#3b82f6'),
('Gestor Financeiro', 'gestor-financeiro', 'Análise financeira e gestão de cobranças', 'Você é um gestor financeiro virtual. Auxilie com análise de vendas, controle de comissões, cobranças pendentes e relatórios financeiros. Seja preciso e objetivo com números.', 'Calculator', '#059669'),
('Secretária', 'secretaria', 'Organização e gestão administrativa', 'Você é uma secretária virtual eficiente. Organize agendamentos, envie lembretes, gerencie tarefas administrativas e mantenha tudo organizado. Seja proativa e detalhista.', 'ClipboardList', '#6366f1'),
('Médico Virtual', 'medico-virtual', 'Orientação sobre suplementação e saúde', 'Você é um consultor de saúde virtual especializado em suplementação. Oriente sobre indicações, contraindicações, dosagens e interações. IMPORTANTE: Sempre recomende consultar um médico para decisões de saúde. Não faça diagnósticos.', 'Stethoscope', '#14b8a6');
