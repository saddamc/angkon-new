"use client";

import type { AdminProductsHookReturn } from "../_hooks/use-admin-products";

interface InventorySummaryCardsProps {
  state: AdminProductsHookReturn;
}

export function InventorySummaryCards({ state }: InventorySummaryCardsProps) {
  const { products, inventorySummary } = state;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-2xl bg-white border border-purple-100/60 p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Products</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{products.length}</p>
        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
          {inventorySummary.inStockCount} active in catalog
        </p>
      </div>
      <div className="rounded-2xl bg-white border border-purple-100/60 p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tracked Stock Units</p>
        <p className="text-xl font-bold text-gray-800 mt-1">
          {inventorySummary.totalUnits.toLocaleString()}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">Physical items in inventory</p>
      </div>
      <div className="rounded-2xl bg-white border border-purple-100/60 p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Stock Value (Buy Price)</p>
        <p className="text-xl font-bold text-purple-600 mt-1">
          {inventorySummary.costVal > 0 ? `৳${Math.round(inventorySummary.costVal).toLocaleString()}` : "—"}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {inventorySummary.itemsWithCost > 0
            ? `${inventorySummary.itemsWithCost} products with buy price`
            : "No buy price provided"}
        </p>
      </div>
      <div className="rounded-2xl bg-white border border-purple-100/60 p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Stock Availability</p>
        <p className="text-xl font-bold text-gray-800 mt-1">
          <span className="text-emerald-600">{inventorySummary.inStockCount}</span>
          <span className="text-gray-400 text-sm font-normal mx-1">in</span>
          <span className="text-gray-300">/</span>
          <span className="text-rose-500 ml-1">{inventorySummary.outOfStockCount}</span>
          <span className="text-gray-400 text-sm font-normal ml-1">out</span>
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">Catalog availability status</p>
      </div>
    </div>
  );
}
