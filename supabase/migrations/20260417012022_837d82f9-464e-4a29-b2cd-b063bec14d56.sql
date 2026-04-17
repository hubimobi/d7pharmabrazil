CREATE TABLE public.whatsapp_template_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  sort_order INTEGER NOT NULL DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.whatsapp_template_folders(id) ON DELETE SET NULL;

ALTER TABLE public.whatsapp_template_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_template_folders" ON public.whatsapp_template_folders
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'administrador'::app_role, 'gestor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'administrador'::app_role, 'gestor'::app_role]));

CREATE INDEX idx_wa_templates_folder ON public.whatsapp_templates(folder_id);