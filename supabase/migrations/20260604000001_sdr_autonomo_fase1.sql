-- =============================================================
-- SDR Autônomo — Fase 1: Schema completo
-- Tabelas: sdr_projects, sdr_leads, sdr_prospecting_history,
--          sdr_ai_conversations, sdr_scheduled_meetings, sdr_lead_outcomes
-- =============================================================

-- ---------------------------------------------------------------
-- Função de updated_at (reutilizável em todos os triggers SDR)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION sdr_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------
-- sdr_projects
-- Uma linha por campanha de coleta (nicho + região)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_projects (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT        NOT NULL,
  niche            TEXT        NOT NULL,
  region_city      TEXT        NOT NULL,
  region_state     CHAR(2)     NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'ACTIVE'
                     CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
  config           JSONB       NOT NULL DEFAULT '{}',
  -- Contadores denormalizados (atualizados pelo workflow após scoring)
  total_leads      INTEGER     NOT NULL DEFAULT 0,
  leads_a          INTEGER     NOT NULL DEFAULT 0,
  leads_b          INTEGER     NOT NULL DEFAULT 0,
  leads_c          INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sdr_projects_updated_at
  BEFORE UPDATE ON public.sdr_projects
  FOR EACH ROW EXECUTE FUNCTION sdr_set_updated_at();

-- ---------------------------------------------------------------
-- sdr_leads
-- Tabela principal. cnpj é a chave de idempotência.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_leads (
  id                        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id                UUID        REFERENCES public.sdr_projects(id) ON DELETE SET NULL,

  -- --- Google Maps (via Apify) ---
  business_name             TEXT        NOT NULL,
  trade_name                TEXT,
  phone                     TEXT,
  email                     TEXT,
  website                   TEXT,
  address_full              TEXT,
  address_city              TEXT,
  address_state             CHAR(2),
  address_postal_code       TEXT,
  google_maps_url           TEXT,
  google_rating             DECIMAL(3,1),
  google_reviews_count      INTEGER,
  google_category           TEXT,

  -- --- Receita Federal (Brasil API) ---
  cnpj                      TEXT        UNIQUE,  -- chave de idempotência
  cnpj_razao_social         TEXT,
  cnpj_nome_fantasia        TEXT,
  cnpj_situacao             TEXT,               -- ATIVA | BAIXADA | SUSPENSA …
  cnpj_data_abertura        DATE,
  cnpj_capital_social       DECIMAL(15,2),
  cnpj_porte                TEXT,               -- ME | EPP | DEMAIS | GRANDE
  cnpj_atividade_principal  TEXT,
  cnpj_municipio            TEXT,
  cnpj_uf                   CHAR(2),
  cnpj_email                TEXT,
  cnpj_telefone             TEXT,
  cnpj_raw                  JSONB,              -- resposta completa Brasil API

  -- --- Presença digital (detectada pelo workflow) ---
  has_website               BOOLEAN,
  has_ssl                   BOOLEAN,
  has_instagram             BOOLEAN,
  has_facebook              BOOLEAN,
  has_google_mybusiness     BOOLEAN,

  -- --- Score IA (Claude Haiku) ---
  score                     TEXT        CHECK (score IN ('A', 'B', 'C')),
  score_rationale           TEXT,               -- 2 frases do modelo
  digital_gap_score         SMALLINT    CHECK (digital_gap_score BETWEEN 0 AND 100),
  identified_pains          JSONB,              -- array de strings
  improvement_opportunities JSONB,              -- array de strings
  first_message_angle       TEXT,
  discard_reason            TEXT,               -- preenchido só quando score = C
  ai_analysis_raw           JSONB,              -- payload completo da API

  -- --- Ciclo de vida ---
  status                    TEXT        NOT NULL DEFAULT 'COLETADO'
                              CHECK (status IN (
                                'COLETADO', 'ENRIQUECIDO', 'ANALISADO',
                                'PROSPECTADO', 'DESCARTADO'
                              )),

  -- --- Validação manual (painel de qualidade) ---
  manual_validated_at       TIMESTAMPTZ,
  manual_score_ok           BOOLEAN,            -- humano confirmou o score?
  manual_notes              TEXT,

  -- --- Metadados ---
  source                    TEXT        NOT NULL DEFAULT 'google_maps_apify',
  apify_run_id              TEXT,
  collected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enriched_at               TIMESTAMPTZ,
  analyzed_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sdr_leads_updated_at
  BEFORE UPDATE ON public.sdr_leads
  FOR EACH ROW EXECUTE FUNCTION sdr_set_updated_at();

-- ---------------------------------------------------------------
-- sdr_prospecting_history
-- Um registro por touchpoint (e-mail, LinkedIn…). Fase 2+.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_prospecting_history (
  id                    UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id               UUID        NOT NULL REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  channel               TEXT        NOT NULL
                          CHECK (channel IN ('EMAIL', 'LINKEDIN', 'WHATSAPP', 'PHONE', 'OTHER')),
  touchpoint_type       TEXT        NOT NULL,  -- FIRST_CONTACT | FOLLOW_UP_1 | FOLLOW_UP_2 …
  subject               TEXT,
  content               TEXT,
  sent_at               TIMESTAMPTZ,
  response_received_at  TIMESTAMPTZ,
  response_content      TEXT,
  status                TEXT        NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN (
                            'DRAFT', 'SENT', 'DELIVERED', 'OPENED',
                            'REPLIED', 'BOUNCED', 'FAILED'
                          )),
  metadata              JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- sdr_ai_conversations
-- Histórico de chamadas IA: rastreabilidade + custo por lead
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_ai_conversations (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id             UUID        REFERENCES public.sdr_leads(id) ON DELETE SET NULL,
  project_id          UUID        REFERENCES public.sdr_projects(id) ON DELETE SET NULL,
  conversation_type   TEXT        NOT NULL
                        CHECK (conversation_type IN (
                          'SCORING', 'OUTREACH_DRAFT', 'FOLLOW_UP_DRAFT', 'OBJECTION_REPLY'
                        )),
  model_used          TEXT        NOT NULL DEFAULT 'claude-haiku-4-5',
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  total_tokens        INTEGER,
  cost_usd            DECIMAL(10,6),
  messages            JSONB       NOT NULL DEFAULT '[]',  -- [{role, content}]
  response_raw        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- sdr_scheduled_meetings
-- Reuniões agendadas. Fase 3+.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_scheduled_meetings (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id           UUID        NOT NULL REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  project_id        UUID        REFERENCES public.sdr_projects(id) ON DELETE SET NULL,
  scheduled_for     TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER     NOT NULL DEFAULT 30,
  meeting_type      TEXT        NOT NULL DEFAULT 'DISCOVERY',
  meeting_link      TEXT,
  calendar_event_id TEXT,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'SCHEDULED'
                      CHECK (status IN (
                        'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
                      )),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sdr_meetings_updated_at
  BEFORE UPDATE ON public.sdr_scheduled_meetings
  FOR EACH ROW EXECUTE FUNCTION sdr_set_updated_at();

-- ---------------------------------------------------------------
-- sdr_lead_outcomes
-- Resultado final do lead: convertido / perdido / nurturing
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_lead_outcomes (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id         UUID        NOT NULL REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  project_id      UUID        REFERENCES public.sdr_projects(id) ON DELETE SET NULL,
  outcome_type    TEXT        NOT NULL
                    CHECK (outcome_type IN (
                      'CONVERTED', 'LOST', 'NURTURING', 'DISQUALIFIED'
                    )),
  deal_value_brl  DECIMAL(12,2),
  service_sold    TEXT,
  lost_reason     TEXT,
  notes           TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sdr_leads_project      ON public.sdr_leads(project_id);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_cnpj         ON public.sdr_leads(cnpj)
  WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sdr_leads_score        ON public.sdr_leads(score)
  WHERE score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sdr_leads_status       ON public.sdr_leads(status);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_city_state   ON public.sdr_leads(address_city, address_state);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_name_fts     ON public.sdr_leads
  USING gin(to_tsvector('portuguese', business_name));
CREATE INDEX IF NOT EXISTS idx_sdr_history_lead       ON public.sdr_prospecting_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_sdr_ai_conv_lead       ON public.sdr_ai_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_sdr_ai_conv_project    ON public.sdr_ai_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_sdr_meetings_lead      ON public.sdr_scheduled_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_sdr_outcomes_lead      ON public.sdr_lead_outcomes(lead_id);

-- ---------------------------------------------------------------
-- ROW LEVEL SECURITY
-- O workflow n8n usa service_role (bypassa RLS).
-- Usuários autenticados (dashboard) acessam tudo.
-- ---------------------------------------------------------------
ALTER TABLE public.sdr_projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_prospecting_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_ai_conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_lead_outcomes      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sdr_projects_auth"     ON public.sdr_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "sdr_leads_auth"        ON public.sdr_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "sdr_history_auth"      ON public.sdr_prospecting_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "sdr_ai_conv_auth"      ON public.sdr_ai_conversations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "sdr_meetings_auth"     ON public.sdr_scheduled_meetings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "sdr_outcomes_auth"     ON public.sdr_lead_outcomes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------
-- VIEW: painel de validação manual de scores
-- Query no Supabase SQL Editor ou em qualquer client SQL
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.sdr_validation_panel AS
SELECT
  l.id,
  p.name                                           AS projeto,
  l.business_name,
  l.google_category,
  l.address_city || '/' || COALESCE(l.address_state,'?')  AS localidade,
  l.google_rating,
  l.google_reviews_count,
  l.website,
  l.has_website,
  l.has_instagram,
  l.cnpj,
  l.cnpj_situacao,
  l.cnpj_porte,
  DATE_PART('year', NOW()) - DATE_PART('year', l.cnpj_data_abertura)  AS anos_ativa,
  l.score,
  l.score_rationale,
  l.digital_gap_score,
  l.identified_pains,
  l.first_message_angle,
  l.manual_score_ok,
  l.manual_notes,
  l.status,
  l.analyzed_at
FROM public.sdr_leads l
LEFT JOIN public.sdr_projects p ON l.project_id = p.id
WHERE l.score IS NOT NULL
ORDER BY
  CASE l.score WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 END,
  l.digital_gap_score DESC NULLS LAST;

-- ---------------------------------------------------------------
-- VIEW: resumo de custo de IA por projeto
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.sdr_ai_cost_summary AS
SELECT
  p.name                                          AS projeto,
  COUNT(c.id)                                     AS total_chamadas,
  SUM(c.total_tokens)                             AS total_tokens,
  SUM(c.cost_usd)                                 AS custo_total_usd,
  ROUND(AVG(c.cost_usd)::NUMERIC, 6)              AS custo_medio_por_lead_usd
FROM public.sdr_ai_conversations c
LEFT JOIN public.sdr_projects p ON c.project_id = p.id
WHERE c.conversation_type = 'SCORING'
GROUP BY p.name
ORDER BY custo_total_usd DESC;
