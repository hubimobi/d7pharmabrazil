import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";

const FeaturedProducts = () => {
  const { data: products, isLoading } = useProducts();

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
          Produtos em Destaque
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Selecionados para você alcançar resultados extraordinários
        </p>
        {isLoading ? (
          <p className="mt-12 text-center text-muted-foreground">Carregando...</p>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products?.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
