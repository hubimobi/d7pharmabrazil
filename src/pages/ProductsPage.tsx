import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ProductCard from "@/components/ProductCard";
import SEOHead from "@/components/SEOHead";
import { useProducts } from "@/hooks/useProducts";

const ProductsPage = () => {
  const { data: products, isLoading } = useProducts();

  return (
    <div className="min-h-screen">
      <SEOHead title="Produtos" description="Suplementos com qualidade farmacêutica D7 Pharma Brazil" />
      <Header />
      <main className="container py-8 md:py-16">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Nossos Produtos</h1>
        <p className="mt-2 text-muted-foreground">Suplementos com qualidade farmacêutica para resultados reais</p>
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
