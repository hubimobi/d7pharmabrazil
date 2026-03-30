import { lazy, Suspense } from "react";
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

const Index = () => {
  const { data: settings } = useStoreSettings();
  const s = settings as any;

  const show = (key: string) => s?.[key] !== false;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Suplementos de Alta Performance" description="D7 Pharma Brazil — suplementos com qualidade farmacêutica para resultados reais. Frete grátis acima de R$199." />
      <NotificationBar />
      <Header />
      <main>
        {show("section_hero_visible") && <HeroSection />}
        {show("section_featured_visible") && <FeaturedCarousel />}
        <FlashSaleCarousel />
        {show("section_benefits_visible") && <BenefitsSection />}
        {show("section_products_visible") && <AllProducts />}
        <Suspense fallback={null}>
          {show("section_testimonials_visible") && <TestimonialsSection />}
          {show("section_promo_banners_visible") && <PromoBanners />}
          {show("section_guarantee_visible") && <GuaranteeSection />}
          {show("section_trust_badges_visible") && <TrustBadges />}
          {show("section_mailing_visible") && <FinalCTA />}
          {show("section_instagram_visible") && <InstagramFeed />}
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
};

export default Index;
