import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useProducts, type Product } from "@/hooks/useProducts";

const FeaturedCarousel = () => {
  const { data: products, isLoading } = useProducts();
  const featured = products?.filter((p: any) => p.featured) ?? [];

  if (isLoading || featured.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
          Produtos em Destaque
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Selecionados para você alcançar resultados extraordinários
        </p>
        <div className="mt-12 px-8 md:px-12">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-4">
              {featured.map((p) => (
                <CarouselItem key={p.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                  <ProductCard product={p} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 md:-left-6" />
            <CarouselNext className="-right-4 md:-right-6" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
