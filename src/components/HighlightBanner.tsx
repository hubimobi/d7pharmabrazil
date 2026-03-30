import { Shield, Truck, CreditCard } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const HighlightBanner = () => {
  const { data: settings } = useStoreSettings();
  const s = settings as any;

  const freeShippingMin = s?.free_shipping_min_value ?? 199;
  const maxInstallments = s?.max_total_installments ?? 10;

  const items = [
    {
      icon: Shield,
      title: "SITE 100% SEGURO",
      subtitle: "Seus dados estão protegidos aqui",
    },
    {
      icon: Truck,
      title: "FRETE GRÁTIS",
      subtitle: `Para compras a partir de R$${freeShippingMin}`,
    },
    {
      icon: CreditCard,
      title: `PARCELE EM ATÉ ${maxInstallments}X`,
      subtitle: "Sem comprometer seu limite",
    },
  ];

  return (
    <section className="py-0">
      <div className="bg-primary text-primary-foreground">
        <div className="container py-8 md:py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
            {items.map((item) => (
              <div key={item.title} className="flex items-center gap-4 justify-center md:justify-start">
                <div className="flex h-14 w-14 md:h-16 md:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
                  <item.icon className="h-7 w-7 md:h-8 md:w-8 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold tracking-wide leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-sm text-primary-foreground/75 mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HighlightBanner;
