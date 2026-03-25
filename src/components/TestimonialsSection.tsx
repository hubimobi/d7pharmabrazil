import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Dr. Ricardo Mendes", role: "Médico Ortopedista", text: "Recomendo os produtos da D7 Pharma para meus pacientes. A qualidade farmacêutica faz toda a diferença nos resultados.", rating: 5 },
  { name: "Ana Paula S.", role: "Cliente", text: "O Protein Kids mudou a alimentação do meu filho. Ele adora o sabor e eu fico tranquila com a qualidade.", rating: 5 },
  { name: "Carlos Eduardo R.", role: "Atleta", text: "O EAA Aminoácido acelerou muito minha recuperação pós-treino. Qualidade premium de verdade!", rating: 5 },
  { name: "Dra. Mariana Costa", role: "Nutricionista", text: "Confio na D7 Pharma pela transparência e rigor nos ingredientes. Indico para todos os meus pacientes.", rating: 5 },
];

const TestimonialsSection = () => (
  <section id="depoimentos" className="bg-muted py-16 md:py-24">
    <div className="container">
      <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
        O que dizem sobre nós
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Profissionais de saúde e clientes confiam na D7 Pharma
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg bg-card p-6 shadow-sm"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-warning text-warning" />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">"{t.text}"</p>
            <div className="mt-4">
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
