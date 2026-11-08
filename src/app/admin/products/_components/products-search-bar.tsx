"use client";

import { Search } from "lucide-react";
import type { AdminProductsHookReturn } from "../_hooks/use-admin-products";

interface ProductsSearchBarProps {
  state: AdminProductsHookReturn;
}

export function ProductsSearchBar({ state }: ProductsSearchBarProps) {
  const { searchQuery, setSearchQuery } = state;

  return (
    <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, SKU, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
        />
      </div>
    </div>
  );
}
