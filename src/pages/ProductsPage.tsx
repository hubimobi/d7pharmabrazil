import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ProductCard from "@/components/ProductCard";
import ComboCard from "@/components/ComboCard";
import SEOHead from "@/components/SEOHead";
import { useProducts } from "@/hooks/useProducts";
import { useCombos } from "@/hooks/useCombos";

const ProductsPage = () => {
  const { data: products, isLoading } = useProducts();
  const { data: combos } = useCombos();

  return (
    <div className="min-h-screen">
      <SEOHead title="Produtos" description="Suplementos com qualidade farmacêutica D7 Pharma Brazil" />
      <Header />
      <main className="container py-8 md:py-16">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Nossos Produtos</h1>
        <p className="mt-2 text-muted-foreground">Suplementos com qualidade farmacêutica para resultados reais</p>

        {/* Combos Section */}
        {combos && combos.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-foreground mb-4">🔥 Combos Promocionais</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {combos.map((combo) => (
                <ComboCard key={combo.id} combo={combo} />
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        {isLoading ? (
          <p className="mt-8 text-center text-muted-foreground">Carregando produtos...</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {products?.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ProductsPage;
