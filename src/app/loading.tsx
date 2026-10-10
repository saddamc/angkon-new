import { ProductGridSkeleton } from "@/components/product/product-grid";

export default function Loading() {
  return (
    <section className="container py-10">
      <div className="mb-6 h-10 w-52 animate-pulse rounded-md bg-white/10" />
      <ProductGridSkeleton />
    </section>
  );
}
