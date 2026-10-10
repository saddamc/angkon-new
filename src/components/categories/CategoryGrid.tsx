"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { WooProduct } from "@/types/product";
import { ProductGrid } from "@/components/product/product-grid";

const SORT_OPTIONS = [
  { value: "popularity", label: "Sort by popularity" },
  { value: "date-desc", label: "Sort by latest" },
  { value: "price-asc", label: "Sort by price: low to high" },
  { value: "price-desc", label: "Sort by price: high to low" },
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-4">
        <p className="text-[14px] text-[#666666]">
          {totalPages > 1
            ? `Showing ${(page - 1) * 24 + 1}–${Math.min(page * 24, total)} of ${total} results`
            : `Showing all ${total} results`}
        </p>
        <div className="relative inline-block self-start sm:self-auto">
          <select
            value={sort}
            onChange={(e) => router.push(hrefWith({ sort: e.target.value, page: "1" }))}
            className="appearance-none bg-white border border-[#dddddd] hover:border-[#bbbbbb] focus:border-black text-[14px] text-[#4e4e4e] py-1.5 sm:py-2 pl-3 pr-8 rounded-[2px] outline-none cursor-pointer transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-[#333333]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555555] stroke-[1.8]" />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <p className="font-heading text-lg font-bold uppercase text-black">No products in this category yet</p>
          <p className="mt-1.5 text-sm text-neutral-500">Check back soon.</p>
        </div>
      ) : (
        <>
          <ProductGrid products={products} />

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              <Link
                href={hrefWith({ page: String(Math.max(1, page - 1)) })}
                aria-disabled={page === 1}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-black shadow-sm transition hover:bg-neutral-100 ${
                  page === 1 ? "pointer-events-none opacity-35" : ""
                }`}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>

              <span className="min-w-[80px] text-center text-sm font-semibold text-black">
                Page {page} of {totalPages}
              </span>

              <Link
                href={hrefWith({ page: String(Math.min(totalPages, page + 1)) })}
                aria-disabled={page === totalPages}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-black shadow-sm transition hover:bg-neutral-100 ${
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
