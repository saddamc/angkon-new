"use client";

import { Plus, RefreshCw } from "lucide-react";
import type { CategoriesManagerHookReturn } from "../_hooks/use-categories-manager";

interface CategoriesHeaderProps {
  state: CategoriesManagerHookReturn;
}

export function CategoriesHeader({ state }: CategoriesHeaderProps) {
  const { flat, load, loading, openAdd } = state;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200/60 shadow-2xs">
            In-Page Category Studio
          </span>
          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            {flat.length} total categories
          </span>
        </div>
        <h1 className="text-[26px] sm:text-[28px] font-black text-gray-900 tracking-tight">
          Categories &amp; Hierarchy
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Manage main collections, nested sub-categories, and cross-listed categories directly in-page.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-bold text-gray-700 transition shadow-2xs cursor-pointer"
          title="Refresh categories from database"
        >
          <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-[13px] font-bold text-white transition shadow-md shadow-purple-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>
    </div>
  );
}
