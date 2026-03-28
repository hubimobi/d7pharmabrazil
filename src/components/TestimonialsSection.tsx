import { Star, Quote } from "lucide-react";

const testimonials = [
  { name: "Dr. Ricardo Mendes", role: "Médico Ortopedista", text: "Recomendo os produtos da D7 Pharma para meus pacientes. A qualidade farmacêutica faz toda a diferença nos resultados.", rating: 5 },
  { name: "Ana Paula S.", role: "Cliente", text: "O Protein Kids mudou a alimentação do meu filho. Ele adora o sabor e eu fico tranquila com a qualidade.", rating: 5 },
  { name: "Carlos Eduardo R.", role: "Atleta", text: "O EAA Aminoácido acelerou muito minha recuperação pós-treino. Qualidade premium de verdade!", rating: 5 },
  { name: "Dra. Mariana Costa", role: "Nutricionista", text: "Confio na D7 Pharma pela transparência e rigor nos ingredientes. Indico para todos os meus pacientes.", rating: 5 },
];

const TestimonialsSection = () => (
  <section id="depoimentos" className="py-12 md:py-24">
    <div className="container">
      <div className="text-center">
        <span className="label-section text-muted-foreground mb-3 block">Depoimentos</span>
        <h2 className="heading-section text-foreground">
          O que dizem sobre nós
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base md:text-lg text-muted-foreground">
          Profissionais de saúde e clientes confiam na D7 Pharma
        </p>
      </div>
      <div className="mt-10 md:mt-16 grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className="relative rounded-2xl bg-card p-5 md:p-6 shadow-elegant hover-lift animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Quote className="absolute top-4 right-4 h-6 w-6 text-primary/10" />
            <div className="flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 md:h-4 md:w-4 fill-warning text-warning" />
              ))}
            </div>
            <p className="mt-3 text-xs md:text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
            <div className="mt-4 flex items-center gap-3 pt-3 border-t border-border/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs md:text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-[10.4px] text-muted-foreground uppercase tracking-wide">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
