import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/product/product-grid";

export default function CategoryLoading() {
  return (
    <div className="container mx-auto max-w-[1500px] space-y-6 px-4 py-8 lg:px-8">
      <Skeleton className="h-4 w-40 bg-black/5" />
      <Skeleton className="h-56 w-full rounded-3xl bg-black/5" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-black/5" />
        ))}
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
