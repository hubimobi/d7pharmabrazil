import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductCombo {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  product_ids: string[];
  price: number;
  original_price: number;
  badge: string | null;
  active: boolean;
  featured: boolean;
}

function mapCombo(c: any): ProductCombo {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    image_url: c.image_url,
    product_ids: Array.isArray(c.product_ids) ? c.product_ids : [],
    price: Number(c.price),
    original_price: Number(c.original_price),
    badge: c.badge || null,
    active: c.active,
    featured: c.featured || false,
  };
}

export function useCombos() {
  return useQuery({
    queryKey: ["combos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_combos" as any)
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map(mapCombo);
    },
  });
}
