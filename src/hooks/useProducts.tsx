import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice: number;
  image: string;
  benefits: string[];
  rating: number;
  reviews: number;
  badge?: string;
  stock: number;
}

// Fallback images for products without uploaded images
import productProteinKids from "@/assets/product-protein-kids.png";
import productTcf4 from "@/assets/product-tcf4.png";
import productEaa from "@/assets/product-eaa.png";

const fallbackImages: Record<string, string> = {
  "protein-kids": productProteinKids,
  "tcf4-control": productTcf4,
  "eaa-aminoacido": productEaa,
};

function mapDbProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.short_description,
    description: p.description,
    price: Number(p.price),
    originalPrice: Number(p.original_price),
    image: p.image_url || fallbackImages[p.slug] || "/placeholder.svg",
    benefits: Array.isArray(p.benefits) ? p.benefits : [],
    rating: Number(p.rating),
    reviews: p.reviews_count,
    badge: p.badge || undefined,
    stock: p.stock,
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map(mapDbProduct);
    },
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug!)
        .eq("active", true)
        .single();
      if (error) throw error;
      return mapDbProduct(data);
    },
    enabled: !!slug,
  });
}
