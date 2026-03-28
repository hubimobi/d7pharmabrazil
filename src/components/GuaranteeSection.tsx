import { ShieldCheck, RotateCcw, Banknote } from "lucide-react";

const guarantees = [
  { icon: RotateCcw, title: "Devolução simplificada", desc: "Processo fácil e sem burocracia" },
  { icon: Banknote, title: "Reembolso integral", desc: "100% do valor devolvido, sem perguntas" },
];

const GuaranteeSection = () => (
  <section className="py-12 md:py-24">
    <div className="container">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-container bg-card p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 shadow-elegant">
          {/* Central highlight */}
          <div className="flex flex-col items-center text-center md:w-1/3 flex-shrink-0">
            <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </div>
            <span className="mt-3 text-4xl md:text-5xl font-bold text-primary font-display">30</span>
            <span className="text-sm md:text-base font-semibold text-foreground">dias de garantia</span>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground">Satisfação garantida ou seu dinheiro de volta</p>
          </div>
          {/* Side items */}
          <div className="flex flex-col gap-4 md:gap-6 flex-1">
            {guarantees.map((g) => (
              <div key={g.title} className="flex items-start gap-3 group">
                <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <g.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-foreground">{g.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default GuaranteeSection;
