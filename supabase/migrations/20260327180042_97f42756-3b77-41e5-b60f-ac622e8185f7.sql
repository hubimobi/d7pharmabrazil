ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS sales_popup_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_popup_position text DEFAULT 'bottom-left',
  ADD COLUMN IF NOT EXISTS sales_popup_button_color text DEFAULT '#f97316',
  ADD COLUMN IF NOT EXISTS sales_popup_interval_min integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sales_popup_interval_max integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS sales_popup_burst_count integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS sales_popup_include_real_orders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_popup_custom_entries jsonb DEFAULT '[]'::jsonb;