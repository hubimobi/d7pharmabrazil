import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PromoBanner {
  id: string;
  slot: number;
  active: boolean;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  image_url: string | null;
  bg_color: string | null;
  image_bg_color: string | null;
}

const PromoBanners = () => {
  const { data: banners } = useQuery({
    queryKey: ["promo-banners-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners" as any)
        .select("*")
        .eq("active", true)
        .order("slot", { ascending: true })
        .limit(2);
      if (error) throw error;
      return data as unknown as PromoBanner[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!banners || banners.length === 0) return null;

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="relative rounded-2xl overflow-hidden flex flex-row min-h-[220px]"
              style={{ backgroundColor: banner.bg_color || "#f5f5f5" }}
            >
              {/* Text content - left side */}
              <div className="flex-1 flex flex-col justify-center p-6 md:p-8">
                {banner.subtitle && (
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
                    {banner.subtitle}
                  </p>
                )}
                <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight mb-4">
                  {banner.title}
                </h3>
                {banner.button_text && (
                  <div>
                    <Link to={banner.button_link || "/produtos"}>
                      <Button size="sm" className="rounded-lg px-8 py-2">
                        {banner.button_text}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Image - right side with separate bg color */}
              {banner.image_url && (
                <div
                  className="w-[40%] sm:w-[38%] flex items-center justify-center p-3 md:p-4"
                  style={{ backgroundColor: banner.image_bg_color || banner.bg_color || "#f5f5f5" }}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoBanners;
