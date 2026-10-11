import { ProductGridSkeleton } from "@/components/product/product-grid";

export default function Loading() {
  return (
    <section className="container py-10 bg-[#400604]">
      <div className="mb-6 h-10 w-52 animate-pulse rounded-md bg-[#E1B76F]/10 border border-[#E1B76F]/10" />
      <ProductGridSkeleton />
    </section>
  );
}
