
-- 1. Remover política permissiva de UPDATE em popup_leads
DROP POLICY IF EXISTS "Anyone can update popup leads by email" ON public.popup_leads;

-- 2. Corrigir auto-aprovação de prescritores
DROP POLICY IF EXISTS "Anyone can self-register as doctor" ON public.doctors;
CREATE POLICY "Anyone can self-register as doctor" ON public.doctors
  FOR INSERT TO anon
  WITH CHECK (
    name IS NOT NULL AND name <> ''
    AND approval_status = 'pending'
  );

-- 3. Criar view pública de produtos (sem cost_price)
DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public AS
  SELECT id, name, slug, short_description, description, price, original_price,
         image_url, extra_images, benefits, rating, reviews_count, badge, stock,
         active, weight, height, width, length, manufacturer, sku, ncm, gtin, unit,
         featured, show_countdown, countdown_mode, countdown_end_time, countdown_end_date,
         countdown_duration_minutes, group_name, seo_title, seo_description, seo_keywords,
         upsell_product_ids, tenant_id, created_at, updated_at
  FROM public.products
  WHERE active = true;

-- Remover SELECT público da tabela products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Admin vê todos os produtos
CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT TO authenticated USING (public.is_admin());

-- Anon pode ler produtos ativos (necessário para a view funcionar)
CREATE POLICY "Public can read active products" ON public.products
  FOR SELECT TO anon USING (active = true);

-- 4. Recriar store_settings_public com campos de tracking
DROP VIEW IF EXISTS public.store_settings_public;
CREATE VIEW public.store_settings_public AS
  SELECT id, store_name, display_name, attendant_name,
         whatsapp, whatsapp_support, instagram, facebook, tiktok, youtube,
         logo_url, horizontal_logo_url, favicon_url,
         hero_title, hero_subtitle, hero_button_text, hero_button_link,
         hero_button2_text, hero_button2_link, hero_image_url,
         hero_media_type, hero_video_url, hero_badges,
         hero_btn1_bg_color, hero_btn1_hover_color, hero_btn2_bg_color, hero_btn2_hover_color,
         hero_carousel_enabled, hero_carousel_effect, hero_carousel_interval,
         free_shipping_enabled, free_shipping_min_value, free_shipping_regions,
         notification_bar_enabled, notification_bar_text, notification_bar_bg_color, notification_bar_text_color,
         popup_banner_enabled, popup_banner_title, popup_banner_description, popup_banner_image_url,
         popup_banner_cta_text, popup_banner_collect_email, popup_banner_delay_seconds,
         popup_banner_reappear_hours,
         benefits_title, benefits_subtitle, benefits_items,
         combo_offer_enabled, combo_offer_products, combo_offer_discount, combo_offer_free_shipping, combo_offer_label,
         hide_chat_on_checkout,
         webchat_enabled, webchat_script, webchat_position, webchat_delay_seconds, webchat_show_on_scroll,
         whatsapp_button_enabled, whatsapp_button_name, whatsapp_button_message,
         whatsapp_position, whatsapp_delay_seconds, whatsapp_show_on_scroll,
         design_title_color, design_text_color, design_icon_color, design_font,
         design_footer_color, design_bg_color, design_icon_style, design_nav_color,
         design_border_style, design_bg_gradient, design_footer_gradient,
         design_footer_text_color, design_footer_title_color,
         sales_popup_enabled, sales_popup_position, sales_popup_button_color,
         sales_popup_interval_min, sales_popup_interval_max, sales_popup_burst_count,
         sales_popup_include_real_orders, sales_popup_custom_entries,
         max_installments, max_total_installments, visual_theme, checkout_version,
         section_benefits_visible, section_featured_visible, section_guarantee_visible,
         section_hero_visible, section_instagram_visible, section_mailing_visible,
         section_order, section_products_visible, section_promo_banners_visible,
         section_testimonials_visible, section_trust_badges_visible,
         products_sidebar_enabled,
         mailing_bg_color, mailing_button_color, mailing_text_color, mailing_title_color,
         cta_title, cta_subtitle,
         checkout_boleto_enabled, checkout_show_combo, checkout_show_free_shipping_bar,
         checkout_show_motivation, checkout_show_recommendations, checkout_show_testimonials,
         checkout_show_urgency, checkout_prescriber_required,
         email, address_city, address_state,
         meta_pixel_id, gtm_id, hotjar_id
  FROM public.store_settings;

-- Remover SELECT público da tabela store_settings
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;

-- Admin vê tudo
CREATE POLICY "Admins can view all store settings" ON public.store_settings
  FOR SELECT TO authenticated USING (public.is_admin());

-- Anon pode ler (necessário para a view funcionar)
CREATE POLICY "Public can read store settings" ON public.store_settings
  FOR SELECT TO anon USING (true);

-- 5. Restringir upload de images a admins
DROP POLICY IF EXISTS "Auth upload images" ON storage.objects;
CREATE POLICY "Admins can upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND public.is_admin());
