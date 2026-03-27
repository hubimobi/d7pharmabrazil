import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SEOHead from "@/components/SEOHead";
import BenefitsSection from "@/components/BenefitsSection";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import AllProducts from "@/components/AllProducts";
import TestimonialsSection from "@/components/TestimonialsSection";
import GuaranteeSection from "@/components/GuaranteeSection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import NotificationBar from "@/components/NotificationBar";

const Index = () => (
  <div className="min-h-screen">
    <SEOHead title="Suplementos de Alta Performance" description="D7 Pharma Brazil — suplementos com qualidade farmacêutica para resultados reais. Frete grátis acima de R$199." />
    <NotificationBar />
    <Header />
    <main>
      <HeroSection />
      <BenefitsSection />
      <FeaturedCarousel />
      <AllProducts />
      <TestimonialsSection />
      <GuaranteeSection />
      <FinalCTA />
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default Index;
