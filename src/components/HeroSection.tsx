import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Truck, Lock, Award, FlaskConical, ShieldCheck, TrendingUp, Star, Heart, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreSettings, HeroBadge } from "@/hooks/useStoreSettings";
import heroBg from "@/assets/hero-bg.jpg";
import { useMemo } from "react";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Shield, Truck, Lock, Award, FlaskConical, ShieldCheck, TrendingUp, Star, Heart, Zap, CheckCircle,
};

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

const HeroSection = () => {
  const { data: settings } = useStoreSettings();

  const title = settings?.hero_title || "Suplementos de Alta Performance com Qualidade Farmacêutica";
  const subtitle = settings?.hero_subtitle || "Resultados reais com segurança e controle rigoroso";
  const btn1Text = settings?.hero_button_text || "Comprar Agora";
  const btn1Link = settings?.hero_button_link || "/produtos";
  const btn2Text = settings?.hero_button2_text || "Saiba Mais";
  const btn2Link = settings?.hero_button2_link || "/#beneficios";
  const bgImage = settings?.hero_image_url || heroBg;
  const mediaType = settings?.hero_media_type || "image";
  const videoUrl = settings?.hero_video_url || "";
  const youtubeId = useMemo(() => extractYoutubeId(videoUrl), [videoUrl]);

  const badges: HeroBadge[] = useMemo(() => {
    if (settings?.hero_badges && Array.isArray(settings.hero_badges) && settings.hero_badges.length > 0) {
      return settings.hero_badges.slice(0, 4);
    }
    return [
      { icon: "Shield", label: "Qualidade Comprovada" },
      { icon: "Lock", label: "Compra Segura" },
      { icon: "Truck", label: "Entrega Rápida" },
      { icon: "Award", label: "Qualidade Premium" },
    ];
  }, [settings?.hero_badges]);

  // Button 1 custom styles
  const btn1Style = useMemo(() => {
    const bg = settings?.hero_btn1_bg_color;
    const hover = settings?.hero_btn1_hover_color;
    if (!bg) return {};
    return {
      "--btn-bg": bg,
      "--btn-hover": hover || bg,
      backgroundColor: bg,
      borderColor: bg,
      color: "#ffffff",
    } as React.CSSProperties;
  }, [settings?.hero_btn1_bg_color, settings?.hero_btn1_hover_color]);

  const btn2Style = useMemo(() => {
    const bg = settings?.hero_btn2_bg_color;
    const hover = settings?.hero_btn2_hover_color;
    if (!bg) return {};
    return {
      "--btn-bg": bg,
      "--btn-hover": hover || bg,
      backgroundColor: bg,
      borderColor: bg,
      color: "#ffffff",
    } as React.CSSProperties;
  }, [settings?.hero_btn2_bg_color, settings?.hero_btn2_hover_color]);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        {mediaType === "video" && youtubeId ? (
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
            <img src={bgImage} alt="D7 Pharma suplementos" className="h-full w-full object-cover" width={1920} height={1080} />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
          </>
        )}
      </div>
      <div className="container relative py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <h1 className="text-3xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80 md:text-xl">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={btn1Link}>
              <Button
                size="lg"
                className="text-base font-semibold px-8 transition-colors"
                style={btn1Style}
                onMouseEnter={(e) => {
                  const hover = settings?.hero_btn1_hover_color;
                  if (hover) (e.currentTarget as HTMLButtonElement).style.backgroundColor = hover;
                }}
                onMouseLeave={(e) => {
                  const bg = settings?.hero_btn1_bg_color;
                  if (bg) (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
                }}
              >
                {btn1Text}
              </Button>
            </Link>
            {btn2Text && (
              <Link to={btn2Link}>
                <Button
                  size="lg"
                  variant={settings?.hero_btn2_bg_color ? "default" : "outline"}
                  className={settings?.hero_btn2_bg_color ? "text-base font-semibold px-8 transition-colors" : "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"}
                  style={btn2Style}
                  onMouseEnter={(e) => {
                    const hover = settings?.hero_btn2_hover_color;
                    if (hover) (e.currentTarget as HTMLButtonElement).style.backgroundColor = hover;
                  }}
                  onMouseLeave={(e) => {
                    const bg = settings?.hero_btn2_bg_color;
                    if (bg) (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
                  }}
                >
                  {btn2Text}
                </Button>
              </Link>
            )}
          </div>
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
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
