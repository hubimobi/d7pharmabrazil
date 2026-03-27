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
    <section id="beneficios" className="bg-muted py-10 md:py-20">
      <div className="container">
        <h2 className="text-center text-xl font-bold text-foreground md:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm md:text-lg text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-8 md:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {benefits.map((b, i) => {
            const IconComp = iconMap[b.icon] || Star;
            return (
              <div
                key={i}
                className="rounded-lg bg-card p-4 md:p-6 text-center shadow-sm animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mx-auto mb-3 md:mb-4 flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-trust-light">
                  <IconComp className="h-5 w-5 md:h-7 md:w-7 text-primary" />
                </div>
                <h3 className="text-xs md:text-base font-semibold text-foreground leading-tight">{b.title}</h3>
                <p className="mt-1 md:mt-2 text-2xs md:text-sm text-muted-foreground hidden md:block">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
