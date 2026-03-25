import { ShieldCheck } from "lucide-react";

const GuaranteeSection = () => (
  <section className="py-16 md:py-24">
    <div className="container">
      <div className="mx-auto max-w-2xl rounded-2xl border-2 border-primary/20 bg-trust-light p-8 text-center md:p-12">
        <ShieldCheck className="mx-auto h-16 w-16 text-primary" />
        <h2 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
          Garantia de Satisfação
        </h2>
        <p className="mt-3 text-muted-foreground">
          Se por qualquer motivo você não ficar satisfeito, devolvemos 100% do seu dinheiro em até 30 dias. Sem burocracia, sem perguntas.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-medium text-primary">
          <span>✓ 30 dias de garantia</span>
          <span>✓ Devolução simplificada</span>
          <span>✓ Reembolso integral</span>
        </div>
      </div>
    </div>
  </section>
);

export default GuaranteeSection;
