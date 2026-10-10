"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WooProduct } from "@/types/product";
import { ProductGrid } from "@/components/product/product-grid";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "title-asc", label: "Name: A → Z" },
  { value: "title-desc", label: "Name: Z → A" },
];

export function CategoryGrid({
  products,
  total,
  page,
  totalPages,
  sort,
  baseHref,
}: {
  products: WooProduct[];
  total: number;
  page: number;
  totalPages: number;
  sort: string;
  baseHref: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hrefWith = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => params.set(key, value));
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-[#cbb18a]">{total} Products</span>
        <select
          value={sort}
          onChange={(e) => router.push(hrefWith({ sort: e.target.value, page: "1" }))}
          className="h-10 rounded-full border border-[#5c0f0d] bg-[#2b0403] px-4 pr-8 text-sm text-[#E1B76F] shadow-md outline-none transition focus:border-[#E1B76F] appearance-none cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#2b0403] text-[#E1B76F]">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#5c0f0d] bg-[#4a0705] py-20 text-center shadow-lg">
          <div className="mb-4 text-5xl">🔍</div>
          <p className="font-heading text-lg font-bold uppercase text-[#E1B76F]">No products in this category yet</p>
          <p className="mt-1.5 text-sm text-[#cbb18a]">Check back soon.</p>
        </div>
      ) : (
        <>
          <ProductGrid products={products} />

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <Link
                href={hrefWith({ page: String(Math.max(1, page - 1)) })}
                aria-disabled={page === 1}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#2b0403] text-[#E1B76F] shadow-md transition hover:bg-[#4a0705] ${
                  page === 1 ? "pointer-events-none opacity-35" : ""
                }`}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>

              <span className="min-w-[80px] text-center text-sm font-semibold text-[#E1B76F]">
                Page {page} of {totalPages}
              </span>

              <Link
                href={hrefWith({ page: String(Math.min(totalPages, page + 1)) })}
                aria-disabled={page === totalPages}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#2b0403] text-[#E1B76F] shadow-md transition hover:bg-[#4a0705] ${
                  page === totalPages ? "pointer-events-none opacity-35" : ""
                }`}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
