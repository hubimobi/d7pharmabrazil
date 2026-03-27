import { ShieldCheck, RotateCcw, Banknote } from "lucide-react";

const guarantees = [
  { icon: ShieldCheck, title: "30 dias de garantia", desc: "Satisfação garantida ou seu dinheiro de volta" },
  { icon: RotateCcw, title: "Devolução simplificada", desc: "Processo fácil e sem burocracia" },
  { icon: Banknote, title: "Reembolso integral", desc: "100% do valor devolvido, sem perguntas" },
];

const GuaranteeSection = () => (
  <section className="py-16 md:py-24">
    <div className="container">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-4">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">
          Garantia de Satisfação
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Se por qualquer motivo você não ficar satisfeito, devolvemos 100% do seu dinheiro em até 30 dias. Sem burocracia, sem perguntas.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
        {guarantees.map((g) => (
          <div key={g.title} className="flex flex-col items-center rounded-xl border border-primary/10 bg-card p-6 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <g.icon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{g.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{g.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default GuaranteeSection;
