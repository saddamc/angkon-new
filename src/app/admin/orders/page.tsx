"use client";

import { useAdminOrders } from "./_hooks/use-admin-orders";
import { OrdersHeader } from "./_components/orders-header";
import { OrdersKpiBar } from "./_components/orders-kpi-bar";
import { StatusFilterPills } from "./_components/status-filter-pills";
import { OrdersSearchBar } from "./_components/orders-search-bar";
import { OrdersTable } from "./_components/orders-table";
import { OrdersModals } from "./_components/orders-modals";
import { OrderDetailsDrawer } from "./_components/order-details-drawer";

export default function AdminOrdersPage() {
  const state = useAdminOrders();

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <OrdersHeader state={state} />

      {/* 2. Summary KPIs */}
      <OrdersKpiBar state={state} />

      {/* 3. Order Status Pills */}
      <StatusFilterPills state={state} />

      {/* 4. Multi-Filter Toolbar & Bulk Bar */}
      <OrdersSearchBar state={state} />

      {/* 5. Responsive Orders Table / Mobile Cards + Pagination */}
      <OrdersTable state={state} />

      {/* 6. Stage 2 Wide Order Details Drawer */}
      <OrderDetailsDrawer state={state} />

      {/* 7. Courier Booking, Payment & Status Modals + Toast */}
      <OrdersModals state={state} />
    </div>
  );
}
