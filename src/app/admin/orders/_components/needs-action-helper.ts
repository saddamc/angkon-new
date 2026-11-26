import type { WCOrder } from "../_types/orders.types";

export interface OrderActionCategory {
  category:
    | "cancellation_request"
    | "payment_verification"
    | "awaiting_confirmation"
    | "ready_to_ship"
    | "booking_failed"
    | "delivery_exception"
    | "refund_pending"
    | "settlement_pending";
  label: string;
  badgeTone: string;
  reason: string;
  recommendedAction: string;
  actionKind:
    | "verify_payment"
    | "switch_cod"
    | "confirm_order"
    | "book_shipment"
    | "retry_booking"
    | "view_delivery"
    | "process_refund"
    | "settle_cod"
    | "review_cancellation";
}

/**
 * Prioritized Needs Action Engine
 * Evaluates orders against the 7 action categories in strict order of operational urgency.
 */
export function getOrderActionCategory(order: WCOrder): OrderActionCategory | null {
  const isFinal = ["cancelled", "refunded", "failed"].includes(order.status);
  const paymentStatus = (order.payment_status || order.paymentStatus || "").toLowerCase();
  const paymentMethod = (order.paymentMethod || "").toLowerCase();
  const shipmentBookingState = order.shipmentBookingState || "not_booked";
  const shipmentStatus = (order.shipmentStatus || "").toLowerCase();
  const hasConsignment = Boolean(order.consignmentId || order.trackingCode);

  // Customer requests are reviewed before normal fulfillment actions. Keeping
  // this as a first-class action makes the request visible in the main table
  // as well as the order drawer.
  if (order.cancellationRequest?.status === "requested") {
    return {
      category: "cancellation_request",
      label: "Cancellation Request",
      badgeTone: "bg-amber-100 text-amber-900 border-amber-300",
      reason: "Customer asked to cancel this order and is waiting for review.",
      recommendedAction: "Review customer cancellation request",
      actionKind: "review_cancellation",
    };
  }

  // Category 1: Booking Failure (Urgent: parcel physically stuck)
  if (shipmentBookingState === "booking_failed") {
    return {
      category: "booking_failed",
      label: "Booking Failed",
      badgeTone: "bg-rose-100 text-rose-800 border-rose-300",
      reason: "Steadfast API rejected consignment booking. Inspect address/phone format.",
      recommendedAction: "Review details & Retry Steadfast booking",
      actionKind: "retry_booking",
    };
  }

  // Category 2: Payment Verification Required (Online SSLCOMMERZ unpaid)
  if (
    paymentMethod === "sslcommerz" &&
    paymentStatus !== "paid" &&
    !isFinal
  ) {
    return {
      category: "payment_verification",
      label: "Payment Verification Required",
      badgeTone: "bg-amber-100 text-amber-900 border-amber-300",
      reason: "Unpaid SSLCOMMERZ transaction. Verify gateway status or agree COD fallback.",
      recommendedAction: "Verify with gateway or Switch to COD",
      actionKind: "verify_payment",
    };
  }

  // Category 3: Orders Awaiting Confirmation
  if (order.status === "pending") {
    return {
      category: "awaiting_confirmation",
      label: "Awaiting Confirmation",
      badgeTone: "bg-orange-100 text-orange-900 border-orange-300",
      reason: "New order placed by customer. Call customer to verify items and shipping address.",
      recommendedAction: "Confirm order with customer",
      actionKind: "confirm_order",
    };
  }

  // Category 4: Orders Ready to Ship (Confirmed/Processing without active courier booking)
  if (
    ["confirmed", "processing", "ready_to_ship"].includes(order.status) &&
    (!hasConsignment || shipmentBookingState === "cancelled") &&
    shipmentBookingState !== "booked" &&
    shipmentBookingState !== "booking_in_progress"
  ) {
    return {
      category: "ready_to_ship",
      label: "Ready to Ship",
      badgeTone: "bg-blue-100 text-blue-900 border-blue-300",
      reason:
        shipmentBookingState === "cancelled"
          ? "Previous courier consignment was cancelled. Ready for re-booking."
          : "Order is verified and ready for courier dispatch.",
      recommendedAction: "Create Steadfast shipment consignment",
      actionKind: "book_shipment",
    };
  }

  // Category 5: Delivery Exceptions (Returned or partial delivered)
  if (
    !isFinal &&
    (["partial_delivered", "returned", "delivery_failed", "hold"].includes(shipmentStatus) ||
      order.status === "returned")
  ) {
    return {
      category: "delivery_exception",
      label: "Delivery Exception",
      badgeTone: "bg-rose-100 text-rose-800 border-rose-300",
      reason: `Courier reported delivery state: "${shipmentStatus.replace(/_/g, " ")}". Check tracking details.`,
      recommendedAction: "Inspect delivery tracking & update stock",
      actionKind: "view_delivery",
    };
  }

  // Category 6: Refunds Pending
  if (paymentStatus === "partially_refunded" || order.status === "refunded") {
    return {
      category: "refund_pending",
      label: "Refund Review",
      badgeTone: "bg-slate-100 text-slate-800 border-slate-300",
      reason: "Order has refund adjustments pending financial audit.",
      recommendedAction: "Review payment refund records",
      actionKind: "process_refund",
    };
  }

  // Category 7: Courier Settlements Pending (Delivered COD awaiting merchant payout)
  if (
    ["delivered", "completed"].includes(order.status) &&
    order.codSettlementStatus === "collected"
  ) {
    return {
      category: "settlement_pending",
      label: "Settlement Pending",
      badgeTone: "bg-emerald-100 text-emerald-900 border-emerald-300",
      reason: "Customer paid COD to courier rider. Merchant bank payout awaiting settlement.",
      recommendedAction: "Reconcile courier payout & mark Settled",
      actionKind: "settle_cod",
    };
  }

  return null;
}
