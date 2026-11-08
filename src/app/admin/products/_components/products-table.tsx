"use client";

import { Package } from "lucide-react";
import { ProductRow } from "./product-row";
import type { AdminProductsHookReturn } from "../_hooks/use-admin-products";

interface ProductsTableProps {
  state: AdminProductsHookReturn;
}

export function ProductsTable({ state }: ProductsTableProps) {
  const {
    allSelected,
    someSelected,
    toggleSelectAll,
    loading,
    filteredProducts,
  } = state;

  return (
    <div className="bg-white rounded-2xl border border-purple-100/60 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1150px]">
          {/* Table header */}
          <div className="grid grid-cols-[40px_45px_64px_1fr_120px_115px_80px_80px_90px_130px_95px_65px] items-center gap-3 px-5 py-3.5 bg-purple-50/70 text-[10px] font-bold uppercase tracking-widest text-purple-600 border-b border-purple-100/50">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer transition"
                title={allSelected ? "Deselect all" : "Select all"}
              />
            </div>
            <span>SL</span>
            <span>Image</span>
            <span>Product Name</span>
            <span>SKU</span>
            <span>Selling Price</span>
            <span>Quantity</span>
            <span>Status</span>
            <span>Added On</span>
            <span>Shipping</span>
            <span className="text-center">Update</span>
            <span className="text-center">Action</span>
          </div>

          {loading ? (
            <div className="divide-y divide-purple-50/80" role="status" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[40px_45px_64px_1fr_120px_115px_80px_80px_90px_130px_95px_65px] items-center gap-3 px-5 py-3.5 animate-pulse"
                >
                  <div className="h-4 w-4 mx-auto rounded bg-purple-100/80" />
                  <div className="h-3 w-5 rounded bg-purple-100/80" />
                  <div className="h-14 w-14 rounded-xl bg-purple-100/70" />
                  <div className="h-4 w-3/4 rounded bg-purple-100/80" />
                  <div className="h-4 w-16 rounded bg-purple-100/70" />
                  <div className="h-4 w-16 rounded bg-purple-100/70" />
                  <div className="h-4 w-12 rounded bg-purple-100/60" />
                  <div className="h-4 w-12 rounded bg-purple-100/60" />
                  <div className="h-4 w-16 rounded bg-purple-100/60" />
                  <div className="h-4 w-16 rounded bg-purple-100/60" />
                  <div className="h-6 w-16 rounded bg-purple-100/70 mx-auto" />
                  <div className="h-6 w-6 rounded bg-purple-100/70 mx-auto" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-24 text-center">
              <Package className="h-12 w-12 mx-auto text-purple-200 mb-3" />
              <p className="text-[15px] font-bold text-gray-700">No products found</p>
              <p className="text-[12px] text-gray-400 mt-1">
                Try adjusting your search criteria or add a new product.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-purple-50">
              {filteredProducts.map((product, idx) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  idx={idx}
                  state={state}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
