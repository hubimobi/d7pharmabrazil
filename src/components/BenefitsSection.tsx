import { motion } from "framer-motion";
import { FlaskConical, Truck, ShieldCheck, TrendingUp } from "lucide-react";

const benefits = [
  { icon: FlaskConical, title: "Alta Qualidade Farmacêutica", desc: "Produtos desenvolvidos com rigoroso controle de qualidade e aprovação ANVISA." },
  { icon: Truck, title: "Entrega Rápida", desc: "Enviamos para todo o Brasil com rastreamento em tempo real." },
  { icon: ShieldCheck, title: "Compra Segura", desc: "Pagamento criptografado e seus dados 100% protegidos." },
  { icon: TrendingUp, title: "Resultados Comprovados", desc: "Fórmulas validadas cientificamente com eficácia comprovada." },
];

const BenefitsSection = () => (
  <section id="beneficios" className="bg-muted py-16 md:py-24">
    <div className="container">
      <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
        Por que escolher a D7 Pharma?
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Compromisso com excelência em cada detalhe
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg bg-card p-6 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-trust-light">
              <b.icon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
