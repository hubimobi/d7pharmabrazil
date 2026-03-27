import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useProducts } from "@/hooks/useProducts";

const FeaturedCarousel = () => {
  const { data: products, isLoading } = useProducts();
  const featured = products?.filter((p: any) => p.featured) ?? [];

  if (!isLoading && featured.length === 0) return null;

  return (
    <section className="py-10 md:py-20">
      <div className="container">
        <h2 className="text-center text-xl font-bold text-foreground md:text-3xl">
          Produtos em Destaque
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm md:text-base text-muted-foreground">
          Selecionados para você alcançar resultados extraordinários
        </p>
        <div className="mt-8 md:mt-12 px-2 md:px-8">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-3 md:-ml-4">
                {featured.map((p) => (
                  <CarouselItem key={p.id} className="pl-3 md:pl-4 basis-1/2 lg:basis-1/3">
                    <ProductCard product={p} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-2 md:-left-6" />
              <CarouselNext className="-right-2 md:-right-6" />
            </Carousel>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
