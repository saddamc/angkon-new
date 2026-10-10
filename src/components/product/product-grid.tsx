import type { WooProduct } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductGrid({ products }: { products: WooProduct[] }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} eager={index === 0} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-[#5c0f0d] bg-[#4a0705]">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-[12px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
