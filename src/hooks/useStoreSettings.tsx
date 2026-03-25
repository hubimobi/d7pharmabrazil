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
