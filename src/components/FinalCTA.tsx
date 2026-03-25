import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FinalCTA = () => (
  <section className="gradient-trust py-16 md:py-24">
    <div className="container text-center">
      <h2 className="text-2xl font-bold text-primary-foreground md:text-4xl">
        Comece sua transformação agora
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">
        Milhares de clientes já confiam na D7 Pharma. Junte-se a eles e experimente suplementos de qualidade farmacêutica.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link to="/produtos">
          <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 font-semibold">
            Ver Produtos
          </Button>
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-primary-foreground/70">
        <span>🔒 Pagamento Seguro</span>
        <span>💳 Pix e Cartão</span>
        <span>🚚 Frete Grátis acima de R$199</span>
        <span>📦 Parcele em até 3x</span>
      </div>
    </div>
  </section>
);

export default FinalCTA;
