
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS design_border_style text NOT NULL DEFAULT 'rounded';

COMMENT ON COLUMN public.store_settings.design_border_style IS 'Border style: rounded or square';
