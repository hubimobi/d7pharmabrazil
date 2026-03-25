import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BenefitsSection from "@/components/BenefitsSection";
import FeaturedProducts from "@/components/FeaturedProducts";
import TestimonialsSection from "@/components/TestimonialsSection";
import GuaranteeSection from "@/components/GuaranteeSection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const Index = () => (
  <div className="min-h-screen">
    <Header />
    <main>
      <HeroSection />
      <BenefitsSection />
      <FeaturedProducts />
      <TestimonialsSection />
      <GuaranteeSection />
      <FinalCTA />
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default Index;
