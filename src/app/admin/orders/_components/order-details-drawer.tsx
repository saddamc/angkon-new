"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";
import { OrderDetailsContent } from "./order-details-content";

interface OrderDetailsDrawerProps {
  state: AdminOrdersHookReturn;
}

export function OrderDetailsDrawer({ state }: OrderDetailsDrawerProps) {
  const {
    detailsOrderNumber,
    detailsData,
    detailsLoading,
    detailsError,
    closeOrderDetails,
    handleStatusChange,
    reopenOrder,
    openShipment,
    refreshShipment,
    cancelShipment,
    reconcilePayments,
    addAdminNote,
    reconcileSettlement,
    recordManualPayment,
    copyValue,
    updating,
    shipmentBusy,
    setCodFallbackModal,
  } = state;

  if (!detailsOrderNumber) return null;

  return (
    <div className="fixed inset-0 z-[180] flex justify-end">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={closeOrderDetails}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${detailsOrderNumber} details`}
        className="relative z-10 flex h-full w-full max-w-2xl lg:max-w-3xl flex-col bg-[#f8f9fc] shadow-2xl border-l border-stone-200"
      >
        <div className="flex-1 overflow-hidden flex flex-col">
          {detailsLoading && !detailsData ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-24 text-[13px] text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading order record, payments & courier tracking...
            </div>
          ) : detailsError ? (
            <div className="p-6">
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {detailsError}
              </div>
            </div>
          ) : detailsData ? (
            <OrderDetailsContent
              data={detailsData}
              isDrawer={true}
              busy={updating === detailsOrderNumber || shipmentBusy}
              onStatusTransition={(status, reason) =>
                handleStatusChange(detailsOrderNumber, status, { reason })
              }
              onReopenOrder={(reason) => reopenOrder(detailsOrderNumber, reason)}
              onOpenShipment={(stub) => openShipment(stub)}
              onRefreshShipment={refreshShipment}
              onCancelShipment={cancelShipment}
              onReconcileSslcommerz={(num) => reconcilePayments(num, detailsOrderNumber)}
              onAddNote={(text) => addAdminNote(detailsOrderNumber, text)}
              onSaveSettlement={(payload) => reconcileSettlement(detailsOrderNumber, payload)}
              onRecordPayment={(payload) => recordManualPayment(detailsOrderNumber, payload)}
              onCodFallback={() =>
                setCodFallbackModal({
                  id: detailsData.order.orderNumber,
                  number: detailsData.order.orderNumber,
                  status: detailsData.order.orderStatus,
                  total: String(detailsData.order.total),
                  paidAmount: detailsData.order.financials.advancePaidAmount,
                  paymentMethod: detailsData.order.paymentMethod,
                  paymentStatus: detailsData.order.paymentStatus,
                  date_created: detailsData.order.createdAt,
                  billing: {
                    first_name: detailsData.order.customer.fullName,
                    phone: detailsData.order.customer.phone,
                  },
                  line_items: [],
                })
              }
              onCopy={(v, l) => void copyValue(v, l)}
              fullPageHref={`/admin/orders/${encodeURIComponent(detailsOrderNumber)}`}
              onClose={closeOrderDetails}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
