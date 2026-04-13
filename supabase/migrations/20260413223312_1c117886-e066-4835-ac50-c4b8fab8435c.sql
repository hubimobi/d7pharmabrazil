
-- whatsapp_templates
DROP POLICY IF EXISTS "Admins can manage whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "staff_manage_templates" ON public.whatsapp_templates FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::public.app_role[]));

-- whatsapp_funnels
DROP POLICY IF EXISTS "Admins can manage whatsapp_funnels" ON public.whatsapp_funnels;
CREATE POLICY "staff_manage_funnels" ON public.whatsapp_funnels FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::public.app_role[]));

-- whatsapp_funnel_steps
DROP POLICY IF EXISTS "Admins can manage whatsapp_funnel_steps" ON public.whatsapp_funnel_steps;
CREATE POLICY "staff_manage_funnel_steps" ON public.whatsapp_funnel_steps FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::public.app_role[]));
