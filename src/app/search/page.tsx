import { getProducts } from "@/services/products.service";
import { ProductGrid } from "@/components/product/product-grid";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const products = await getProducts({ search: q });
  const normalized = (q || "").toLowerCase();

  const result = q
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          product.short_description.toLowerCase().includes(normalized),
      )
    : products;

  return (
    <section className="container py-10">
      <h1 className="font-heading text-4xl sm:text-5xl font-black uppercase text-white">Search Results</h1>
      <p className="mt-2 text-sm text-white/90">
        {q ? `Showing results for "${q}"` : "Showing all products"}
      </p>

      <div className="mt-8">
        {result.length ? (
          <ProductGrid products={result} />
        ) : (
          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-8 text-center text-white/90">No matching products found.</div>
        )}
      </div>
    </section>
  );
}
