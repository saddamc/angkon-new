"use client";

import { Trash2 } from "lucide-react";
import type { AdminProductsHookReturn } from "../_hooks/use-admin-products";

interface BulkActionsBannerProps {
  state: AdminProductsHookReturn;
}

export function BulkActionsBanner({ state }: BulkActionsBannerProps) {
  const { selectedIds, setSelectedIds, filteredProducts, openBulkDelete } = state;

  if (selectedIds.size === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-purple-900/15 border border-purple-800 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-black text-white shadow-inner">
          {selectedIds.size}
        </div>
        <div>
          <span className="text-[13px] font-bold">
            {selectedIds.size} {selectedIds.size === 1 ? "product" : "products"} selected
          </span>
          <span className="text-purple-300 text-[12px] ml-2">
            (out of {filteredProducts.length})
          </span>
        </div>
        {selectedIds.size < filteredProducts.length && (
          <button
            type="button"
            onClick={() => setSelectedIds(new Set(filteredProducts.map((p) => p.id)))}
            className="text-[12px] font-semibold underline underline-offset-2 text-purple-200 hover:text-white transition ml-1 cursor-pointer"
          >
            Select all {filteredProducts.length}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedIds(new Set())}
          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-semibold transition cursor-pointer"
        >
          Clear Selection
        </button>
        <button
          type="button"
          onClick={openBulkDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[12px] font-bold transition shadow-sm cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Delete Selected ({selectedIds.size})
        </button>
      </div>
    </div>
  );
}
