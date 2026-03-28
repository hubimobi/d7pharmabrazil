import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useProducts } from "@/hooks/useProducts";

const FeaturedCarousel = () => {
  const { data: products, isLoading } = useProducts();
  const featured = products?.filter((p: any) => p.featured) ?? [];

  if (!isLoading && featured.length === 0) return null;

  return (
    <section className="py-12 md:py-24">
      <div className="container">
        <div className="text-center">
          <span className="label-section text-muted-foreground mb-3 block">Destaques</span>
          <h2 className="heading-section text-foreground">
            Produtos em Destaque
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base md:text-lg text-muted-foreground">
            Selecionados para você alcançar resultados extraordinários
          </p>
        </div>
        <div className="mt-10 md:mt-16 px-2 md:px-8">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
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
              <CarouselPrevious className="-left-2 md:-left-6 rounded-full" />
              <CarouselNext className="-right-2 md:-right-6 rounded-full" />
            </Carousel>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
