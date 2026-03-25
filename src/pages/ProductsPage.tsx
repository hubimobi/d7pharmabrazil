import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

const ProductsPage = () => (
  <div className="min-h-screen">
    <Header />
    <main className="container py-8 md:py-16">
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">Nossos Produtos</h1>
      <p className="mt-2 text-muted-foreground">Suplementos com qualidade farmacêutica para resultados reais</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default ProductsPage;
