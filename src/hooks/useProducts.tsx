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
  extraImages: string[];
  benefits: string[];
  rating: number;
  reviews: number;
  badge?: string;
  stock: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  showCountdown: boolean;
  countdownMode: string;
  countdownEndTime: string | null;
  countdownEndDate: string | null;
  countdownDurationMinutes: number;
  featured: boolean;
  groupName: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  sku: string;
  upsellProductIds: string[];
}

// Fallback images for products without uploaded images
import productProteinKids from "@/assets/product-protein-kids.png";
import productTcf4 from "@/assets/product-tcf4.png";
import productEaa from "@/assets/product-eaa.png";
import noProductImage from "@/assets/no-product-image.gif";

const fallbackImages: Record<string, string> = {
  "protein-kids": productProteinKids,
  "tcf4-control": productTcf4,
  "eaa-aminoacido": productEaa,
};

function mapDbProduct(p: any): Product {
  const mainImage = p.image_url || fallbackImages[p.slug] || noProductImage;
  const extras = Array.isArray(p.extra_images) ? p.extra_images.filter(Boolean) : [];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.short_description,
    description: p.description,
    price: Number(p.price),
    originalPrice: Number(p.original_price),
    image: mainImage,
    extraImages: extras,
    benefits: Array.isArray(p.benefits) ? p.benefits : [],
    rating: Number(p.rating),
    reviews: p.reviews_count,
    badge: p.badge || undefined,
    stock: p.stock,
    weight: Number(p.weight) || 0.3,
    height: Number(p.height) || 5,
    width: Number(p.width) || 15,
    length: Number(p.length) || 20,
    showCountdown: p.show_countdown !== false,
    countdownMode: p.countdown_mode || "end_of_day",
    countdownEndTime: p.countdown_end_time || null,
    countdownEndDate: p.countdown_end_date || null,
    countdownDurationMinutes: p.countdown_duration_minutes || 60,
    featured: p.featured === true,
    groupName: p.group_name || "",
    seoTitle: p.seo_title || "",
    seoDescription: p.seo_description || "",
    seoKeywords: p.seo_keywords || "",
    sku: p.sku || "",
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
