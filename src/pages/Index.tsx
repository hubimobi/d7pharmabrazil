import { lazy, Suspense, useMemo, ReactNode } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SEOHead from "@/components/SEOHead";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import HighlightBanner from "@/components/HighlightBanner";
import BenefitsSection from "@/components/BenefitsSection";
import AllProducts from "@/components/AllProducts";
import FlashSaleCarousel from "@/components/FlashSaleCarousel";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import NotificationBar from "@/components/NotificationBar";
import CookieConsent from "@/components/CookieConsent";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const PromoBanners = lazy(() => import("@/components/PromoBanners"));
const GuaranteeSection = lazy(() => import("@/components/GuaranteeSection"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const FinalCTA = lazy(() => import("@/components/FinalCTA"));
const InstagramFeed = lazy(() => import("@/components/InstagramFeed"));

const DEFAULT_ORDER = [
  "section_hero_visible",
  "section_featured_visible",
  "section_benefits_visible",
  "section_products_visible",
  "section_testimonials_visible",
  "section_promo_banners_visible",
  "section_guarantee_visible",
  "section_trust_badges_visible",
  "section_mailing_visible",
  "section_instagram_visible",
];

const SECTION_COMPONENTS: Record<string, { component: React.ComponentType; lazy?: boolean }> = {
  section_hero_visible: { component: HeroSection },
  section_featured_visible: { component: FeaturedCarousel },
  section_benefits_visible: { component: BenefitsSection },
  section_products_visible: { component: AllProducts },
  section_testimonials_visible: { component: TestimonialsSection, lazy: true },
  section_promo_banners_visible: { component: PromoBanners, lazy: true },
  section_guarantee_visible: { component: GuaranteeSection, lazy: true },
  section_trust_badges_visible: { component: TrustBadges, lazy: true },
  section_mailing_visible: { component: FinalCTA, lazy: true },
  section_instagram_visible: { component: InstagramFeed, lazy: true },
};

const Index = () => {
  const { data: settings } = useStoreSettings();
  const s = settings as any;

  const show = (key: string) => s?.[key] !== false;

  const sectionOrder: string[] = useMemo(() => {
    const order = s?.section_order;
    if (Array.isArray(order) && order.length > 0) {
      const all = [...order.filter((k: string) => k in SECTION_COMPONENTS), ...DEFAULT_ORDER.filter((k) => !order.includes(k))];
      return all;
    }
    return DEFAULT_ORDER;
  }, [s?.section_order]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Suplementos de Alta Performance" description="D7 Pharma Brazil — suplementos com qualidade farmacêutica para resultados reais. Frete grátis acima de R$199." />
      <NotificationBar />
      <Header />
      <main>
        <HighlightBanner />
        <FlashSaleCarousel />
        {sectionOrder.map((key) => {
          if (!show(key)) return null;
          const sec = SECTION_COMPONENTS[key];
          if (!sec) return null;
          const Component = sec.component;
          if (sec.lazy) {
            return (
              <Suspense key={key} fallback={null}>
                <Component />
              </Suspense>
            );
          }
          return <Component key={key} />;
        })}
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
};

export default Index;
