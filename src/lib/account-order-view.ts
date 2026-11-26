/**
 * Pure customer-friendly order presentation helpers.
 * Converts internal order/payment/shipment states into clear, everyday English.
 */

export const ORDER_TIMELINE_STEPS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "on_the_way", label: "On the Way" },
  { key: "delivered", label: "Delivered" },
] as const;

export interface CustomerOrderViewInput {
  orderStatus?: string | null;
  orderStatusLabel?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  paidAmount?: number | null;
  total: number;
  shipmentStatus?: string | null;
  trackingCode?: string | null;
  consignmentId?: string | null;
  cancellationRequest?: { status?: string | null } | null;
  refundSummary?: { totalRefunded?: number; pendingRefundAmount?: number } | null;
  isOnlinePayment?: boolean;
}

export interface CustomerOrderPresentation {
  /** Single primary pill shown on top-right of the card. */
  statusPill: {
    label: string;
    tone: "gold" | "emerald" | "amber" | "rose" | "sky" | "neutral";
  };
  /** Concise payment note under the price, e.g. "Paid Online" or "Cash on Delivery". */
  paymentCaption: string;
  /** Single clear sentence summarizing where the order currently stands. */
  summaryLine: string;
  /** 0..3 progress index across ORDER_TIMELINE_STEPS, or -1 if terminal/blocked. */
  stageIndex: number;
  terminalVariant: "cancelled" | "returned" | "failed" | "awaiting_payment" | null;
  canPayNow: boolean;
}

function fmtMoney(amount: number) {
  return `৳${Math.max(0, Math.round(Number(amount) || 0)).toLocaleString("en-BD")}`;
}

export function buildCustomerOrderPresentation(
  order: CustomerOrderViewInput
): CustomerOrderPresentation {
  const oStatus = String(order.orderStatus || "pending").trim().toLowerCase();
  const pStatus = String(order.paymentStatus || "pending").trim().toLowerCase();
  const sStatus = String(order.shipmentStatus || "").trim().toLowerCase();
  const total = Number(order.total) || 0;
  const paid = Number(order.paidAmount) || 0;
  const due = Math.max(0, total - paid);
  const refunded = Number(order.refundSummary?.totalRefunded) || 0;
  const pendingRefund = Number(order.refundSummary?.pendingRefundAmount) || 0;
  const isOnline = Boolean(order.isOnlinePayment);
  const hasTracking = Boolean(order.trackingCode || order.consignmentId);

  const canPayNow =
    isOnline &&
    !["paid", "refunded", "partially_refunded", "refund_pending", "cancelled"].includes(pStatus) &&
    !["cancelled", "returned", "refunded", "delivered", "completed"].includes(oStatus);

  let paymentCaption = "Cash on Delivery";
  if (pStatus === "refunded" || refunded >= total && refunded > 0) {
    paymentCaption = `Refunded ${fmtMoney(refunded || total)}`;
  } else if (pStatus === "partially_refunded" || refunded > 0) {
    paymentCaption = `Partially refunded (${fmtMoney(refunded)})`;
  } else if (pStatus === "refund_pending" || pendingRefund > 0) {
    paymentCaption = `Refund in progress (${fmtMoney(pendingRefund || paid)})`;
  } else if (pStatus === "paid") {
    paymentCaption = "Paid Online";
  } else if (pStatus === "partially_paid") {
    paymentCaption = `Advance ${fmtMoney(paid)} paid • ${fmtMoney(due)} due`;
  } else if (isOnline) {
    paymentCaption = pStatus === "failed" ? "Payment unsuccessful" : "Payment pending";
  } else if (due > 0 && oStatus !== "cancelled") {
    paymentCaption = `Cash on Delivery • ${fmtMoney(due)} due`;
  }

  // Terminal states first
  if (oStatus === "cancelled") {
    return {
      statusPill: { label: "Cancelled", tone: "rose" },
      paymentCaption,
      summaryLine:
        refunded > 0
          ? `This order was cancelled. ${fmtMoney(refunded)} has been refunded.`
          : pendingRefund > 0
          ? `This order was cancelled. A refund of ${fmtMoney(pendingRefund)} is being processed.`
          : "This order was cancelled.",
      stageIndex: -1,
      terminalVariant: "cancelled",
      canPayNow: false,
    };
  }

  if (oStatus === "returned" || oStatus === "refunded" || sStatus === "returned") {
    return {
      statusPill: { label: "Returned", tone: "sky" },
      paymentCaption,
      summaryLine:
        refunded > 0
          ? `Items returned and ${fmtMoney(refunded)} refunded.`
          : "Order marked as returned.",
      stageIndex: -1,
      terminalVariant: "returned",
      canPayNow: false,
    };
  }

  if (oStatus === "failed") {
    return {
      statusPill: { label: "Payment Failed", tone: "rose" },
      paymentCaption,
      summaryLine: "Online payment could not be completed.",
      stageIndex: -1,
      terminalVariant: "failed",
      canPayNow,
    };
  }

  if (canPayNow && (oStatus === "pending" || pStatus === "pending" || pStatus === "failed")) {
    return {
      statusPill: { label: "Awaiting Payment", tone: "amber" },
      paymentCaption,
      summaryLine: "Complete your online payment so we can confirm and pack your order.",
      stageIndex: -1,
      terminalVariant: "awaiting_payment",
      canPayNow: true,
    };
  }

  if (order.cancellationRequest?.status === "requested") {
    return {
      statusPill: { label: "Cancel Requested", tone: "amber" },
      paymentCaption,
      summaryLine: "Your cancellation request is under review by our team.",
      stageIndex: 0,
      terminalVariant: null,
      canPayNow: false,
    };
  }

  // Delivered
  if (oStatus === "delivered" || oStatus === "completed" || sStatus === "delivered") {
    return {
      statusPill: { label: "Delivered", tone: "emerald" },
      paymentCaption,
      summaryLine: "Delivered safely. Thank you for shopping with ANGKON.",
      stageIndex: 3,
      terminalVariant: null,
      canPayNow: false,
    };
  }

  // On the way
  if (
    oStatus === "shipped" ||
    ["picked_up", "in_transit", "out_for_delivery", "partial_delivered"].includes(sStatus)
  ) {
    const label =
      sStatus === "out_for_delivery"
        ? "Out for Delivery"
        : "On the Way";
    return {
      statusPill: { label, tone: "sky" },
      paymentCaption,
      summaryLine:
        sStatus === "out_for_delivery"
          ? "Your parcel is out for delivery today — keep your phone handy."
          : "Your parcel has been picked up by the courier and is on the way.",
      stageIndex: 2,
      terminalVariant: null,
      canPayNow: false,
    };
  }

  // Packed / Ready / Booked
  if (
    oStatus === "processing" ||
    oStatus === "ready_to_ship" ||
    ["booked", "created", "pickup_pending", "in_review"].includes(sStatus)
  ) {
    const label = oStatus === "ready_to_ship" || hasTracking ? "Ready for Courier" : "Packing";
    return {
      statusPill: { label, tone: "gold" },
      paymentCaption,
      summaryLine: hasTracking
        ? "Packed and booked with courier — awaiting pickup."
        : "Our atelier team is packing your items carefully.",
      stageIndex: 1,
      terminalVariant: null,
      canPayNow: false,
    };
  }

  // Confirmed / Pending COD
  return {
    statusPill: { label: oStatus === "confirmed" ? "Confirmed" : "Order Placed", tone: "gold" },
    paymentCaption,
    summaryLine: "Order received and confirmed. Preparation starts shortly.",
    stageIndex: 0,
    terminalVariant: null,
    canPayNow,
  };
}
