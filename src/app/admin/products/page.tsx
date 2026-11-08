"use client";

import { useAdminProducts } from "./_hooks/use-admin-products";
import { ProductsHeader } from "./_components/products-header";
import { InventorySummaryCards } from "./_components/inventory-summary-cards";
import { ProductsSearchBar } from "./_components/products-search-bar";
import { BulkActionsBanner } from "./_components/bulk-actions-banner";
import { ProductsTable } from "./_components/products-table";
import { ProductsModals } from "./_components/products-modals";

export default function AdminProductsPage() {
  const state = useAdminProducts();

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <ProductsHeader state={state} />

      {/* 2. Inventory & Valuation Summary Cards */}
      <InventorySummaryCards state={state} />

      {/* 3. Search Bar */}
      <ProductsSearchBar state={state} />

      {/* 4. Selection & Bulk Actions Banner */}
      <BulkActionsBanner state={state} />

      {/* 5. Products Table */}
      <ProductsTable state={state} />

      {/* 6. Context Menu & Confirmation Modals */}
      <ProductsModals state={state} />
    </div>
  );
}
