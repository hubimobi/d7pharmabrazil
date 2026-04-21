-- 1) Reverter store_settings_public para security_invoker = off
ALTER VIEW public.store_settings_public SET (security_invoker = off);
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- 2) is_default em ai_llm_config
ALTER TABLE public.ai_llm_config
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Trigger: garantir no máximo um default por tenant
CREATE OR REPLACE FUNCTION public.ensure_single_default_llm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.ai_llm_config
    SET is_default = false
    WHERE id <> NEW.id
      AND COALESCE(tenant_id::text,'') = COALESCE(NEW.tenant_id::text,'');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_single_default_llm ON public.ai_llm_config;
CREATE TRIGGER trg_ensure_single_default_llm
BEFORE INSERT OR UPDATE OF is_default ON public.ai_llm_config
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_single_default_llm();

-- Marcar um default existente caso nenhum esteja marcado (por tenant)
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY COALESCE(tenant_id::text,'') ORDER BY active DESC, created_at ASC) AS rn,
         (SELECT COUNT(*) FROM public.ai_llm_config c2
          WHERE COALESCE(c2.tenant_id::text,'') = COALESCE(c.tenant_id::text,'')
            AND c2.is_default = true) AS has_default
  FROM public.ai_llm_config c
)
UPDATE public.ai_llm_config x
SET is_default = true
FROM ranked r
WHERE x.id = r.id AND r.rn = 1 AND r.has_default = 0;
