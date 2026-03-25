import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Truck, Lock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const badges = [
  { icon: Shield, label: "ANVISA" },
  { icon: Lock, label: "Compra Segura" },
  { icon: Truck, label: "Entrega Rápida" },
  { icon: Award, label: "Qualidade Premium" },
];

const HeroSection = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0">
      <img src={heroBg} alt="D7 Pharma suplementos" className="h-full w-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
    </div>
    <div className="container relative py-20 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-2xl"
      >
        <h1 className="text-3xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
          Suplementos de Alta Performance com Qualidade Farmacêutica
        </h1>
        <p className="mt-4 text-lg text-primary-foreground/80 md:text-xl">
          Resultados reais com segurança e controle rigoroso
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/produtos">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold px-8">
              Comprar Agora
            </Button>
          </Link>
          <Link to="/#beneficios">
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              Saiba Mais
            </Button>
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          {badges.map((b) => (
            <div key={b.label} className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-xs font-medium text-primary-foreground backdrop-blur-sm">
              <b.icon className="h-4 w-4" />
              {b.label}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
