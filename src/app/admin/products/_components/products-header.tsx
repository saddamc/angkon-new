"use client";

import Link from "next/link";
import { Package, RefreshCw, Plus } from "lucide-react";
import type { AdminProductsHookReturn } from "../_hooks/use-admin-products";

interface ProductsHeaderProps {
  state: AdminProductsHookReturn;
}

export function ProductsHeader({ state }: ProductsHeaderProps) {
  const { load, loading } = state;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Products Catalog</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-[13px] text-gray-600 hover:text-purple-600 hover:border-purple-300 transition shadow-sm cursor-pointer"
          title="Refresh product list"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-[13px] font-bold text-white transition shadow-md shadow-purple-200"
        >
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>
    </div>
  );
}
