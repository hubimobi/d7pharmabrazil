
-- 1. tenant_integrations
DROP POLICY IF EXISTS "Tenant staff read integrations" ON public.tenant_integrations;
DROP POLICY IF EXISTS "Tenant admins read integrations" ON public.tenant_integrations;
CREATE POLICY "Tenant admins read integrations"
ON public.tenant_integrations FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = tenant_integrations.tenant_id
      AND tu.role IN ('admin','administrador')
  )
);

-- 2. whatsapp_instances
DROP POLICY IF EXISTS "tenant_iso_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_admin_select" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_admin_select"
ON public.whatsapp_instances FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = whatsapp_instances.tenant_id
      AND tu.role IN ('admin','administrador')
  )
);

-- 3. tenant_config_backups
DROP POLICY IF EXISTS "tenant_config_backups_staff_select" ON public.tenant_config_backups;
DROP POLICY IF EXISTS "tenant_config_backups_admin_select" ON public.tenant_config_backups;
CREATE POLICY "tenant_config_backups_admin_select"
ON public.tenant_config_backups FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = tenant_config_backups.tenant_id
      AND tu.role IN ('admin','administrador')
  )
);

-- 4. store_settings: full row admin-only, safe view for staff
DROP POLICY IF EXISTS "store_settings_staff_select" ON public.store_settings;
DROP POLICY IF EXISTS "store_settings_admin_full_select" ON public.store_settings;
CREATE POLICY "store_settings_admin_full_select"
ON public.store_settings FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = store_settings.tenant_id
      AND tu.role IN ('admin','administrador')
  )
);

-- Safe view: all columns EXCEPT api keys / tracking ids
DROP VIEW IF EXISTS public.store_settings_safe;
CREATE VIEW public.store_settings_safe
WITH (security_invoker=on) AS
SELECT s.* FROM public.store_settings s;
-- Drop sensitive columns from view by recreating without them
DROP VIEW public.store_settings_safe;
CREATE VIEW public.store_settings_safe
WITH (security_invoker=on) AS
SELECT
  id, tenant_id, store_name, display_name, attendant_name,
  cnpj, email, whatsapp, whatsapp_support,
  address_street, address_number, address_complement,
  address_neighborhood, address_city, address_state, address_cep,
  instagram, facebook, tiktok, youtube,
  logo_url, favicon_url, horizontal_logo_url,
  webchat_enabled, webchat_position, webchat_delay_seconds, webchat_show_on_scroll,
  whatsapp_button_enabled, whatsapp_button_name, whatsapp_button_message,
  whatsapp_position, whatsapp_delay_seconds, whatsapp_show_on_scroll,
  hide_chat_on_checkout,
  hero_title, hero_subtitle, hero_button_text, hero_button_link,
  hero_button2_text, hero_button2_link, hero_image_url, hero_media_type,
  hero_video_url, hero_badges, hero_btn1_bg_color, hero_btn1_hover_color,
  hero_btn2_bg_color, hero_btn2_hover_color, hero_carousel_enabled,
  hero_carousel_effect, hero_carousel_interval,
  benefits_title, benefits_subtitle, benefits_items,
  combo_offer_enabled, combo_offer_products, combo_offer_discount,
  combo_offer_free_shipping, combo_offer_label,
  free_shipping_enabled, free_shipping_min_value, free_shipping_regions,
  notification_bar_enabled, notification_bar_text,
  notification_bar_bg_color, notification_bar_text_color,
  popup_banner_enabled, popup_banner_title, popup_banner_description,
  popup_banner_image_url, popup_banner_cta_text, popup_banner_collect_email,
  popup_banner_delay_seconds,
  design_title_color, design_text_color, design_icon_color, design_font,
  design_footer_color, design_bg_color, design_icon_style, design_nav_color,
  design_bg_gradient, design_footer_gradient, design_footer_text_color,
  design_footer_title_color, design_border_style,
  sales_popup_enabled, sales_popup_position, sales_popup_button_color,
  sales_popup_interval_min, sales_popup_interval_max, sales_popup_burst_count,
  sales_popup_include_real_orders, sales_popup_custom_entries,
  checkout_show_testimonials, checkout_show_urgency, checkout_show_combo,
  checkout_show_recommendations, checkout_show_motivation,
  checkout_show_free_shipping_bar, checkout_version, checkout_boleto_enabled,
  max_installments, max_total_installments,
  cta_title, cta_subtitle,
  mailing_bg_color, mailing_button_color, mailing_title_color, mailing_text_color,
  section_hero_visible, section_featured_visible, section_benefits_visible,
  section_products_visible, section_testimonials_visible,
  section_promo_banners_visible, section_guarantee_visible,
  section_trust_badges_visible, section_mailing_visible, section_instagram_visible,
  visual_theme, section_order, feedback_bonus_coupon_id,
  goal_monthly_revenue, goal_conversion_rate, goal_cart_recovery,
  goal_upsell, goal_ltv, goal_profit_margin,
  created_at, updated_at
FROM public.store_settings;
GRANT SELECT ON public.store_settings_safe TO authenticated, anon;

-- 5. profiles: admin restricted to same-tenant
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view profiles in their tenant" ON public.profiles;
CREATE POLICY "Admins view profiles in their tenant"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.tenant_users me
    JOIN public.tenant_users target
      ON target.tenant_id = me.tenant_id
    WHERE me.user_id = auth.uid()
      AND me.role IN ('admin','administrador')
      AND target.user_id = profiles.user_id
  )
);

-- 6. Storage: drop broad public listing policies (direct GET still works for public buckets)
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view store assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
