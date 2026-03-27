import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SEOHead from "@/components/SEOHead";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import BenefitsSection from "@/components/BenefitsSection";
import AllProducts from "@/components/AllProducts";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import NotificationBar from "@/components/NotificationBar";

const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const GuaranteeSection = lazy(() => import("@/components/GuaranteeSection"));
const FinalCTA = lazy(() => import("@/components/FinalCTA"));

const Index = () => (
  <div className="min-h-screen">
    <SEOHead title="Suplementos de Alta Performance" description="D7 Pharma Brazil — suplementos com qualidade farmacêutica para resultados reais. Frete grátis acima de R$199." />
    <NotificationBar />
    <Header />
    <main>
      <HeroSection />
      <FeaturedCarousel />
      <BenefitsSection />
      <AllProducts />
      <Suspense fallback={null}>
        <TestimonialsSection />
        <GuaranteeSection />
        <FinalCTA />
      </Suspense>
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default Index;
