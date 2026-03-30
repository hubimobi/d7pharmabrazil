import { useState, useEffect, useMemo } from "react";
import { Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

const ITEMS_PER_VIEW = 3;
const AUTO_ROTATE_MS = 4000;

export default function FlashSaleCarousel() {
  const { data: products, isLoading } = useProducts();
  
  const flashProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.showCountdown && p.originalPrice > p.price);
  }, [products]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const totalSlides = Math.max(1, Math.ceil(flashProducts.length / ITEMS_PER_VIEW));

  useEffect(() => {
    if (flashProducts.length <= ITEMS_PER_VIEW) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [flashProducts.length, totalSlides]);

  if (isLoading) {
    return (
      <section className="py-8 bg-destructive/5">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  if (flashProducts.length === 0) return null;

  const visibleProducts = flashProducts.slice(
    currentIndex * ITEMS_PER_VIEW,
    currentIndex * ITEMS_PER_VIEW + ITEMS_PER_VIEW
  );

  // If slice goes past end, wrap around
  const display = visibleProducts.length < ITEMS_PER_VIEW && flashProducts.length > ITEMS_PER_VIEW
    ? [...visibleProducts, ...flashProducts.slice(0, ITEMS_PER_VIEW - visibleProducts.length)]
    : visibleProducts;

  return (
    <section className="py-8 md:py-12 bg-destructive/5">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2">
              <Zap className="h-5 w-5 text-destructive-foreground fill-current" />
              <span className="text-sm md:text-base font-bold text-destructive-foreground uppercase tracking-wide">
                Ofertas Relâmpago
              </span>
              <Zap className="h-5 w-5 text-destructive-foreground fill-current" />
            </div>
          </div>
          {flashProducts.length > ITEMS_PER_VIEW && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)}
                className="rounded-full border border-border p-2 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % totalSlides)}
                className="rounded-full border border-border p-2 hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {display.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Dots */}
        {totalSlides > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all ${i === currentIndex ? "w-6 bg-destructive" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
