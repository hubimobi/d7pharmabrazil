import { Skeleton } from "@/components/ui/skeleton";

const ProductCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
    <Skeleton className="aspect-square w-full" />
    <div className="p-3 md:p-4 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="pt-2 space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  </div>
);

export default ProductCardSkeleton;
