-- =============================================================
-- SDR Autônomo — Fase 1 v2: novos campos de scoring estruturado
-- Adiciona colunas para o score auditável por bloco e dados de
-- presença digital enriquecidos (site, WhatsApp, Instagram)
-- =============================================================

-- ---------------------------------------------------------------
-- sdr_projects — adiciona a oferta da campanha
-- ---------------------------------------------------------------
ALTER TABLE public.sdr_projects
  ADD COLUMN IF NOT EXISTS oferta TEXT;

-- ---------------------------------------------------------------
-- sdr_leads — scoring auditável por bloco
-- ---------------------------------------------------------------
ALTER TABLE public.sdr_leads
  -- Score por bloco (espelha a régua do prompt)
  ADD COLUMN IF NOT EXISTS score_capacidade      SMALLINT CHECK (score_capacidade BETWEEN 0 AND 30),
  ADD COLUMN IF NOT EXISTS score_dor             SMALLINT CHECK (score_dor BETWEEN 0 AND 40),
  ADD COLUMN IF NOT EXISTS score_encaixe         SMALLINT CHECK (score_encaixe BETWEEN 0 AND 30),
  ADD COLUMN IF NOT EXISTS score_final           SMALLINT CHECK (score_final BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS rebaixado_por_capacidade BOOLEAN,

  -- Saídas qualitativas do novo prompt
  ADD COLUMN IF NOT EXISTS gancho_de_abordagem   TEXT,         -- dor mais forte para 1º contato
  ADD COLUMN IF NOT EXISTS justificativa_encaixe TEXT,         -- 1 frase: oferta resolve a dor?
  ADD COLUMN IF NOT EXISTS dores_estruturadas    JSONB,        -- [{dor, evidencia, impacto}]
  ADD COLUMN IF NOT EXISTS dados_ausentes_ia     JSONB,        -- campos que faltaram para scoring

  -- Oferta desta campanha (herdada do projeto)
  ADD COLUMN IF NOT EXISTS oferta_campanha       TEXT,

  -- Dados de presença digital enriquecidos
  ADD COLUMN IF NOT EXISTS site_velocidade_segundos DECIMAL(5,1),  -- PageSpeed / medição HTTP
  ADD COLUMN IF NOT EXISTS site_conteudo         TEXT,             -- texto extraído do site
  ADD COLUMN IF NOT EXISTS tem_whatsapp          BOOLEAN,
  ADD COLUMN IF NOT EXISTS instagram_posts_30d   SMALLINT,         -- posts nos últimos 30 dias
  ADD COLUMN IF NOT EXISTS instagram_ultimo_post_dias SMALLINT,    -- dias desde o último post
  ADD COLUMN IF NOT EXISTS instagram_bio         TEXT;

-- ---------------------------------------------------------------
-- Índices adicionais
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sdr_leads_score_final
  ON public.sdr_leads(score_final DESC NULLS LAST)
  WHERE score_final IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sdr_leads_grade_capacidade
  ON public.sdr_leads(score, score_capacidade)
  WHERE score IS NOT NULL;

-- ---------------------------------------------------------------
-- Atualiza a view sdr_validation_panel com os novos campos
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.sdr_validation_panel AS
SELECT
  l.id,
  p.name                                                        AS projeto,
  p.oferta,
  l.business_name,
  l.google_category,
  l.address_city || '/' || COALESCE(l.address_state,'?')       AS localidade,
  l.google_rating,
  l.google_reviews_count,
  l.website,
  l.site_velocidade_segundos,
  l.has_website,
  l.tem_whatsapp,
  l.has_instagram,
  l.instagram_posts_30d,
  l.instagram_ultimo_post_dias,
  l.cnpj,
  l.cnpj_situacao,
  l.cnpj_porte,
  DATE_PART('year', NOW()) - DATE_PART('year', l.cnpj_data_abertura) AS anos_ativa,
  l.cnpj_capital_social,
  -- Score por bloco
  l.score_capacidade,
  l.score_dor,
  l.score_encaixe,
  l.score_final,
  l.score                                                       AS grade,
  l.rebaixado_por_capacidade,
  -- Qualitativo
  l.gancho_de_abordagem,
  l.justificativa_encaixe,
  l.dores_estruturadas,
  l.dados_ausentes_ia,
  -- Validação manual
  l.manual_score_ok,
  l.manual_notes,
  l.status,
  l.analyzed_at
FROM public.sdr_leads l
LEFT JOIN public.sdr_projects p ON l.project_id = p.id
WHERE l.score IS NOT NULL
ORDER BY
  CASE l.score WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 END,
  l.score_final DESC NULLS LAST;
