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

const ICON_STYLE_CLASSES: Record<string, string> = {
  rounded: "rounded-xl bg-primary/10",
  circle: "rounded-full bg-primary/10",
  outline: "rounded-xl border-2 border-primary/30 bg-transparent",
  gradient: "rounded-xl bg-gradient-to-br from-primary/20 to-primary/5",
  solid: "rounded-xl bg-primary",
};

const BenefitsSection = () => {
  const { data: settings } = useStoreSettings();

  const title = settings?.benefits_title || "Por que escolher a D7 Pharma?";
  const subtitle = settings?.benefits_subtitle || "Compromisso com excelência em cada detalhe";
  const benefits = settings?.benefits_items?.length ? settings.benefits_items : defaultBenefits;
  const logoUrl = settings?.logo_url;
  const iconStyle = settings?.design_icon_style || "rounded";
  const iconColor = settings?.design_icon_color;
  const iconContainerCls = ICON_STYLE_CLASSES[iconStyle] || ICON_STYLE_CLASSES.rounded;

  return (
    <section id="beneficios" className="py-10 md:py-20 bg-muted/40">
      <div className="container">
        {/* Logo + Title */}
        <div className="flex flex-col items-center text-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="object-contain mb-4 rounded-xl"
              style={{ width: 300, height: 300 }}
            />
          )}
          <h2 className="text-xl font-bold text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm md:text-lg text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="mt-8 md:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {benefits.map((b, i) => {
            const IconComp = iconMap[b.icon] || Star;
            const isSolid = iconStyle === "solid";
            return (
              <div
                key={i}
                className="flex items-start gap-3 md:gap-4 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className={`flex-shrink-0 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center ${iconContainerCls}`}
                  style={!isSolid && iconColor ? { borderColor: iconColor + "4D" } : undefined}
                >
                  <IconComp
                    className="h-5 w-5 md:h-6 md:w-6"
                    style={{
                      color: isSolid ? "#ffffff" : (iconColor || undefined),
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-semibold text-foreground leading-tight">{b.title}</h3>
                  <p className="mt-0.5 text-2xs md:text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
