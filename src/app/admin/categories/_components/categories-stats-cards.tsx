"use client";

import type { CategoriesManagerHookReturn } from "../_hooks/use-categories-manager";

interface CategoriesStatsCardsProps {
  state: CategoriesManagerHookReturn;
}

export function CategoriesStatsCards({ state }: CategoriesStatsCardsProps) {
  const { flat, mainCount, subCount, activeCount } = state;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          Total Categories
        </p>
        <p className="text-[24px] font-black text-gray-900">{flat.length}</p>
      </div>
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          Main Categories
        </p>
        <p className="text-[24px] font-black text-gray-900">{mainCount}</p>
      </div>
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          Subcategories
        </p>
        <p className="text-[24px] font-black text-gray-900">{subCount}</p>
      </div>
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          Active Storefront
        </p>
        <p className="text-[24px] font-black text-emerald-600">{activeCount}</p>
      </div>
    </div>
  );
}
