import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Truck, Lock, Award, FlaskConical, ShieldCheck, TrendingUp, Star, Heart, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import heroBg from "@/assets/hero-bg.jpg";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Shield, Truck, Lock, Award, FlaskConical, ShieldCheck, TrendingUp, Star, Heart, Zap, CheckCircle,
};

interface HeroBanner {
  id: string;
  sort_order: number;
  active: boolean;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  button2_text: string;
  button2_link: string;
  btn1_bg_color: string | null;
  btn1_hover_color: string | null;
  btn2_bg_color: string | null;
  btn2_hover_color: string | null;
  media_type: string;
  image_url: string | null;
  video_url: string | null;
  side_image_url: string | null;
  badges: Array<{ icon: string; label: string }>;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

const effectVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.6 },
  },
  slide: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: { duration: 0.5 },
  },
  zoom: {
    initial: { opacity: 0, scale: 1.1 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.6 },
  },
};

const HeroSection = () => {
  const { data: settings } = useStoreSettings();
  const [current, setCurrent] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ["hero-banners-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners" as any)
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((b) => ({
        ...b,
        badges: Array.isArray(b.badges) ? b.badges : [],
      })) as HeroBanner[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeBanners = banners || [];
  const carouselEnabled = (settings as any)?.hero_carousel_enabled ?? true;
  const effect = (settings as any)?.hero_carousel_effect || "fade";
  const interval = ((settings as any)?.hero_carousel_interval || 5) * 1000;

  const next = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrent((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  useEffect(() => {
    if (!carouselEnabled || activeBanners.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [carouselEnabled, interval, next, activeBanners.length]);

  const safeIndex = activeBanners.length > 0 ? current % activeBanners.length : 0;
  const banner = activeBanners.length > 0 ? activeBanners[safeIndex] : null;

  const btn1Style = useMemo(() => {
    if (!banner?.btn1_bg_color) return {};
    return { backgroundColor: banner.btn1_bg_color, borderColor: banner.btn1_bg_color, color: "#ffffff" } as React.CSSProperties;
  }, [banner?.btn1_bg_color]);

  const btn2Style = useMemo(() => {
    if (!banner?.btn2_bg_color) return {};
    return { backgroundColor: banner.btn2_bg_color, borderColor: banner.btn2_bg_color, color: "#ffffff" } as React.CSSProperties;
  }, [banner?.btn2_bg_color]);

  // Fallback if no banners
  if (!banner) {
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Banner" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
        </div>
        <div className="container relative py-20 md:py-32">
          <h1 className="text-3xl font-extrabold leading-tight text-primary-foreground md:text-5xl">
            {settings?.hero_title || "Suplementos de Alta Performance"}
          </h1>
        </div>
      </section>
    );
  }

  const variants = effectVariants[effect as keyof typeof effectVariants] || effectVariants.fade;
  const youtubeId = banner.media_type === "video" && banner.video_url ? extractYoutubeId(banner.video_url) : null;
  const bgImage = banner.image_url || heroBg;
  const badges = (banner.badges || []).slice(0, 3);

  return (
    <section className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={variants.transition}
          className="absolute inset-0"
        >
          {youtubeId ? (
            <>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                className="absolute inset-0 h-full w-full scale-150 object-cover pointer-events-none"
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{ border: 0 }}
                title="Banner video"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
            </>
          ) : (
            <>
              <img src={bgImage} alt="Banner" className="h-full w-full object-cover" width={1920} height={1080} />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="container relative py-20 md:py-32">
        <div className={`flex items-center gap-8 ${banner.side_image_url ? "justify-between" : ""}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={banner.id + "-content"}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={banner.side_image_url ? "max-w-xl" : "max-w-2xl"}
            >
              <h1 className="text-3xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
                {banner.title}
              </h1>
              {banner.subtitle && (
                <p className="mt-4 text-lg text-primary-foreground/80 md:text-xl">
                  {banner.subtitle}
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                {banner.button_text && (
                  <Link to={banner.button_link || "/produtos"}>
                    <Button
                      size="lg"
                      className="text-base font-semibold px-8 transition-colors"
                      style={btn1Style}
                      onMouseEnter={(e) => {
                        if (banner.btn1_hover_color) (e.currentTarget as HTMLButtonElement).style.backgroundColor = banner.btn1_hover_color;
                      }}
                      onMouseLeave={(e) => {
                        if (banner.btn1_bg_color) (e.currentTarget as HTMLButtonElement).style.backgroundColor = banner.btn1_bg_color;
                      }}
                    >
                      {banner.button_text}
                    </Button>
                  </Link>
                )}
                {banner.button2_text && (
                  <Link to={banner.button2_link || "/"}>
                    <Button
                      size="lg"
                      variant={banner.btn2_bg_color ? "default" : "outline"}
                      className={banner.btn2_bg_color ? "text-base font-semibold px-8 transition-colors" : "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"}
                      style={btn2Style}
                      onMouseEnter={(e) => {
                        if (banner.btn2_hover_color) (e.currentTarget as HTMLButtonElement).style.backgroundColor = banner.btn2_hover_color;
                      }}
                      onMouseLeave={(e) => {
                        if (banner.btn2_bg_color) (e.currentTarget as HTMLButtonElement).style.backgroundColor = banner.btn2_bg_color;
                      }}
                    >
                      {banner.button2_text}
                    </Button>
                  </Link>
                )}
              </div>
              {badges.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-4">
                  {badges.map((b) => {
                    const IconComp = ICON_MAP[b.icon] || Shield;
                    return (
                      <div key={b.label} className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                        <IconComp className="h-4 w-4" />
                        {b.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Side Image */}
          {banner.side_image_url && (
            <AnimatePresence mode="wait">
              <motion.div
                key={banner.id + "-side"}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="hidden lg:block flex-shrink-0"
              >
                <img
                  src={banner.side_image_url}
                  alt="Destaque"
                  className="max-h-[400px] w-auto object-contain drop-shadow-2xl"
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Dots indicator */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {activeBanners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === current % activeBanners.length
                  ? "w-8 bg-primary-foreground"
                  : "w-2.5 bg-primary-foreground/40 hover:bg-primary-foreground/60"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroSection;
