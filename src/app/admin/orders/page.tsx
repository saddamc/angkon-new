"use client";

import { useAdminOrders } from "./_hooks/use-admin-orders";
import { OrdersHeader } from "./_components/orders-header";
import { StatusFilterPills } from "./_components/status-filter-pills";
import { OrdersSearchBar } from "./_components/orders-search-bar";
import { OrdersTable } from "./_components/orders-table";
import { OrdersModals } from "./_components/orders-modals";

export default function AdminOrdersPage() {
  const state = useAdminOrders();

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <OrdersHeader />

      {/* 2. Status Filter Pills */}
      <StatusFilterPills state={state} />

      {/* 3. Search & Actions */}
      <OrdersSearchBar state={state} />

      {/* 4. Orders Table */}
      <OrdersTable state={state} />

      {/* 5. Modals & Notifications */}
      <OrdersModals state={state} />
    </div>
  );
}
