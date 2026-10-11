"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search } from "lucide-react";
import type { WooProduct } from "@/types/product";

export function ProductsFilterBar({ products }: { products: WooProduct[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");

  const categories = useMemo(
    () =>
      Array.from(new Set(products.flatMap((product) => product.categories.map((item) => item.slug)))).filter(Boolean),
    [products],
  );

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (search) {
      params.set("q", search);
    } else {
      params.delete("q");
    }

    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }

    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="mb-8 rounded-[12px] border border-[#5c0f0d] bg-[#4a0705] p-4 shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search drops, polo shirts, pants..."
            className="h-11 w-full rounded-[10px] border border-[#5c0f0d] bg-[#2b0403] pl-10 pr-4 text-sm text-white placeholder-[#cbb18a]/60 outline-none transition focus:border-[#E1B76F]"
          />
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-11 rounded-[10px] border border-[#5c0f0d] bg-[#2b0403] px-4 text-sm font-medium text-white outline-none transition focus:border-[#E1B76F]"
        >
          <option value="" className="bg-[#2b0403] text-white">All Categories</option>
          {categories.map((item) => (
            <option key={item} value={item} className="bg-[#2b0403] text-white">
              {item.replace(/-/g, " ").toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyFilters}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#E1B76F] bg-[#E1B76F] px-6 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87] hover:text-[#400604]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
      </div>
    </div>
  );
}
