import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  favicon_url: string;
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
