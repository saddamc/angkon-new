"use client";

import { useAdminOrders } from "./_hooks/use-admin-orders";
import { OrdersHeader } from "./_components/orders-header";
import { OrdersKpiBar } from "./_components/orders-kpi-bar";
import { StatusFilterPills } from "./_components/status-filter-pills";
import { OrdersSearchBar } from "./_components/orders-search-bar";
import { OrdersTable } from "./_components/orders-table";
import { OrdersModals } from "./_components/orders-modals";
import { CreateOrderModal } from "./_components/create-order-modal";
import { OrderDetailsDrawer } from "./_components/order-details-drawer";

export default function AdminOrdersPage() {
  const state = useAdminOrders();

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <OrdersHeader state={state} />

      {/* 2. Summary KPIs — the desktop status filter (click any card) */}
      <OrdersKpiBar state={state} />

      {/* 3. Compact status pills — mobile/tablet only. On desktop the KPI
          cards above already filter by the same keys, so a second pill row
          would only duplicate them. */}
      <div className="lg:hidden">
        <StatusFilterPills state={state} />
      </div>

      {/* 4. Multi-Filter Toolbar & Bulk Bar */}
      <OrdersSearchBar state={state} />

      {/* 5. Responsive Orders Table / Mobile Cards + Pagination */}
      <OrdersTable state={state} />

      {/* 6. Stage 2 Wide Order Details Drawer */}
      <OrderDetailsDrawer state={state} />

      {/* 7. Courier Booking, Payment & Status Modals + Toast */}
      <OrdersModals state={state} />

      {/* 8. Manual Order creation (admin / phone orders) */}
      <CreateOrderModal
        open={state.createOrderModalOpen}
        busy={state.creatingOrder}
        onClose={() => state.setCreateOrderModalOpen(false)}
        onCreate={state.createManualOrder}
      />
    </div>
  );
}
