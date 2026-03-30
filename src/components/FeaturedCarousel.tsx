import { useCallback, useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useProducts } from "@/hooks/useProducts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UseEmblaCarouselType } from "embla-carousel-react";

type CarouselApi = UseEmblaCarouselType[1];

const FeaturedCarousel = () => {
  const { data: products, isLoading } = useProducts();
  const featured = products?.filter((p: any) => p.featured) ?? [];
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentSnap, setCurrentSnap] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
    setCurrentSnap(api.selectedScrollSnap());
    setSnapCount(api.scrollSnapList().length);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  // Auto-scroll every 5 seconds when more than visible
  useEffect(() => {
    if (!api || featured.length <= 4) return;
    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [api, featured.length]);

  if (!isLoading && featured.length === 0) return null;

  return (
    <section className="py-12 md:py-24">
      <div className="container">
        {/* Header with navigation */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <span className="label-section text-muted-foreground mb-2 block">Destaques</span>
            <h2 className="heading-section text-foreground">
              Produtos em Destaque
            </h2>
            <p className="mt-2 max-w-xl text-sm md:text-base text-muted-foreground">
              Selecionados para você alcançar resultados extraordinários
            </p>
          </div>
          {featured.length > 4 && (
            <div className="hidden md:flex items-center gap-3">
              {/* Dots */}
              <div className="flex gap-1.5 mr-2">
                {Array.from({ length: snapCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => api?.scrollTo(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSnap
                        ? "w-6 bg-primary"
                        : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => api?.scrollPrev()}
                disabled={!canScrollPrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-all hover:bg-muted hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => api?.scrollNext()}
                disabled={!canScrollNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-all hover:bg-muted hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : featured.length <= 4 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="relative">
            <Carousel
              opts={{ align: "start", loop: true, slidesToScroll: 1 }}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent className="-ml-3 md:-ml-4">
                {featured.map((p) => (
                  <CarouselItem key={p.id} className="pl-3 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <ProductCard product={p} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Mobile navigation */}
            <div className="flex items-center justify-center gap-3 mt-6 md:hidden">
              <button
                onClick={() => api?.scrollPrev()}
                disabled={!canScrollPrev}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: snapCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => api?.scrollTo(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentSnap ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/25"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => api?.scrollNext()}
                disabled={!canScrollNext}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedCarousel;
