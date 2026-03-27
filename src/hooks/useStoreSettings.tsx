import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeroBadge {
  icon: string;
  label: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  cnpj: string;
  email: string;
  whatsapp: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_cep: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  webchat_enabled: boolean;
  webchat_script: string;
  whatsapp_button_enabled: boolean;
  whatsapp_button_name: string;
  whatsapp_button_message: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  hero_button_link: string;
  hero_button2_text: string;
  hero_button2_link: string;
  hero_image_url: string;
  logo_url: string;
  horizontal_logo_url: string;
  favicon_url: string;
  whatsapp_position: string;
  whatsapp_delay_seconds: number;
  whatsapp_show_on_scroll: boolean;
  webchat_position: string;
  webchat_delay_seconds: number;
  webchat_show_on_scroll: boolean;
  // Hero media (legacy, kept for compatibility)
  hero_media_type: string;
  hero_video_url: string;
  hero_badges: HeroBadge[];
  hero_btn1_bg_color: string;
  hero_btn1_hover_color: string;
  hero_btn2_bg_color: string;
  hero_btn2_hover_color: string;
  // Carousel settings
  hero_carousel_enabled: boolean;
  hero_carousel_effect: string;
  hero_carousel_interval: number;
  // Shipping
  free_shipping_enabled: boolean;
  free_shipping_min_value: number;
  free_shipping_regions: string;
  // Notification bar
  notification_bar_enabled: boolean;
  notification_bar_text: string;
  notification_bar_bg_color: string;
  notification_bar_text_color: string;
  // Popup banner
  popup_banner_enabled: boolean;
  popup_banner_title: string;
  popup_banner_description: string;
  popup_banner_image_url: string;
  popup_banner_cta_text: string;
  popup_banner_collect_email: boolean;
  popup_banner_delay_seconds: number;
  // Benefits section
  benefits_title: string;
  benefits_subtitle: string;
  benefits_items: Array<{ icon: string; title: string; desc: string }>;
  // Combo offer
  combo_offer_enabled: boolean;
  combo_offer_products: string[];
  combo_offer_discount: number;
  combo_offer_free_shipping: boolean;
  combo_offer_label: string;
  hide_chat_on_checkout: boolean;
  // Design settings
  design_title_color: string;
  design_text_color: string;
  design_icon_color: string;
  design_font: string;
  design_footer_color: string;
  design_bg_color: string;
  design_icon_style: string;
  hide_chat_on_checkout: boolean;
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as StoreSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
