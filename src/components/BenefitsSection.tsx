import { motion } from "framer-motion";
import { FlaskConical, Truck, ShieldCheck, TrendingUp, Heart, Star, Zap, Clock, Eye, Gift, ThumbsUp, CheckCircle, Sparkles, type LucideIcon } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const iconMap: Record<string, LucideIcon> = {
  FlaskConical, Truck, ShieldCheck, TrendingUp, Heart, Star, Zap, Clock, Eye, Gift, ThumbsUp, CheckCircle, Sparkles,
};

const defaultBenefits = [
  { icon: "FlaskConical", title: "Alta Qualidade Farmacêutica", desc: "Produtos desenvolvidos com rigoroso controle de qualidade e aprovação ANVISA." },
  { icon: "Truck", title: "Entrega Rápida", desc: "Enviamos para todo o Brasil com rastreamento em tempo real." },
  { icon: "ShieldCheck", title: "Compra Segura", desc: "Pagamento criptografado e seus dados 100% protegidos." },
  { icon: "TrendingUp", title: "Resultados Comprovados", desc: "Fórmulas validadas cientificamente com eficácia comprovada." },
];

const BenefitsSection = () => {
  const { data: settings } = useStoreSettings();

  const title = settings?.benefits_title || "Por que escolher a D7 Pharma?";
  const subtitle = settings?.benefits_subtitle || "Compromisso com excelência em cada detalhe";
  const benefits = settings?.benefits_items?.length ? settings.benefits_items : defaultBenefits;

  return (
    <section id="beneficios" className="bg-muted py-16 md:py-24">
      <div className="container">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => {
            const IconComp = iconMap[b.icon] || Star;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-lg bg-card p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-trust-light">
                  <IconComp className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
