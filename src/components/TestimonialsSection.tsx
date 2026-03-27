import { Star } from "lucide-react";

const testimonials = [
  { name: "Dr. Ricardo Mendes", role: "Médico Ortopedista", text: "Recomendo os produtos da D7 Pharma para meus pacientes. A qualidade farmacêutica faz toda a diferença nos resultados.", rating: 5 },
  { name: "Ana Paula S.", role: "Cliente", text: "O Protein Kids mudou a alimentação do meu filho. Ele adora o sabor e eu fico tranquila com a qualidade.", rating: 5 },
  { name: "Carlos Eduardo R.", role: "Atleta", text: "O EAA Aminoácido acelerou muito minha recuperação pós-treino. Qualidade premium de verdade!", rating: 5 },
  { name: "Dra. Mariana Costa", role: "Nutricionista", text: "Confio na D7 Pharma pela transparência e rigor nos ingredientes. Indico para todos os meus pacientes.", rating: 5 },
];

const TestimonialsSection = () => (
  <section id="depoimentos" className="bg-muted py-10 md:py-20">
    <div className="container">
      <h2 className="text-center text-xl font-bold text-foreground md:text-3xl">
        O que dizem sobre nós
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm md:text-lg text-muted-foreground">
        Profissionais de saúde e clientes confiam na D7 Pharma
      </p>
      <div className="mt-8 md:mt-12 grid gap-3 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className="rounded-lg bg-card p-4 md:p-6 shadow-sm animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 md:h-4 md:w-4 fill-warning text-warning" />
              ))}
            </div>
            <p className="mt-2 md:mt-3 text-xs md:text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
            <div className="mt-3 md:mt-4">
              <p className="text-xs md:text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-2xs md:text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
