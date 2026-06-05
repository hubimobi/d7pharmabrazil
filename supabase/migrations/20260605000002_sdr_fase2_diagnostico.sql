-- =============================================================
-- SDR Autônomo — Fase 2: Diagnóstico Digital + Lead Magnet
-- Adiciona colunas para diagnóstico gerado por IA e PDF
-- =============================================================

ALTER TABLE public.sdr_leads
  ADD COLUMN IF NOT EXISTS diagnostico_json    JSONB,
  ADD COLUMN IF NOT EXISTS diagnostico_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS diagnosticado_at    TIMESTAMPTZ,
  -- Gate de revisão humana antes de disparar na Fase 3
  ADD COLUMN IF NOT EXISTS diagnostico_aprovado     BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diagnostico_revisado_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS diagnostico_revisor_notas TEXT;

-- Índice para busca rápida de leads prontos para revisão
CREATE INDEX IF NOT EXISTS idx_sdr_leads_diagnostico_status
  ON public.sdr_leads(score, status, diagnostico_aprovado)
  WHERE score = 'A';

-- ---------------------------------------------------------------
-- VIEW: fila de revisão de diagnósticos para o responsável
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.sdr_diagnostico_review AS
SELECT
  l.id,
  l.business_name,
  l.address_city || '/' || COALESCE(l.address_state,'?')  AS localidade,
  l.google_category,
  l.score                                                  AS grade,
  l.score_final,
  l.gancho_de_abordagem,
  l.diagnostico_pdf_url,
  l.diagnostico_aprovado,
  l.diagnostico_revisado_at,
  l.diagnostico_revisor_notas,
  l.diagnosticado_at,
  -- Dados úteis para contexto na revisão
  l.google_rating,
  l.google_reviews_count,
  l.has_website,
  l.tem_whatsapp,
  l.cnpj_porte,
  p.oferta
FROM public.sdr_leads l
LEFT JOIN public.sdr_projects p ON l.project_id = p.id
WHERE l.score = 'A'
  AND l.status IN ('DIAGNOSTICADO', 'ANALISADO')
ORDER BY
  l.diagnostico_aprovado NULLS FIRST,   -- pendentes primeiro
  l.score_final DESC;
