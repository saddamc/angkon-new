import type { WooProduct } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductGrid({ products }: { products: WooProduct[] }) {
  return (
    <div className="grid gap-x-3.5 sm:gap-x-5 md:gap-x-6 gap-y-6 sm:gap-y-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} eager={index === 0} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid gap-x-3.5 sm:gap-x-5 md:gap-x-6 gap-y-6 sm:gap-y-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden bg-white animate-pulse">
          <Skeleton className="aspect-square w-full rounded-none bg-neutral-100" />
          <div className="space-y-1.5 pt-2.5">
            <Skeleton className="h-3.5 w-3/4 rounded bg-neutral-100" />
            <Skeleton className="h-3 w-1/3 rounded bg-neutral-100" />
            <Skeleton className="h-3.5 w-1/2 rounded bg-neutral-100" />
            <Skeleton className="h-6 w-24 rounded-full bg-neutral-100 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
