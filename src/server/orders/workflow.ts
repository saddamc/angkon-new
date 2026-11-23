/**
 * Pure Order Workflow, Financial Breakdown & COD Rules Engine.
 *
 * Intentionally dependency-free (no `@/` or Mongoose imports) so it can be
 * imported directly by both Next.js runtime code and `node --test` scripts.
 */

export const CANONICAL_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "failed",
] as const;

export type CanonicalOrderStatus = (typeof CANONICAL_ORDER_STATUSES)[number];

export const LEGACY_ORDER_STATUSES = [
  "completed",
  "on-hold",
  "refunded",
] as const;

export type AnyOrderStatus =
  | CanonicalOrderStatus
  | (typeof LEGACY_ORDER_STATUSES)[number]
  | string;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Returned / Refunded",
  "on-hold": "On Hold",
  failed: "Failed",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  partially_paid: "Partially Paid",
  failed: "Failed",
  refund_pending: "Refund Pending",
  refunded: "Refunded",
  cancelled: "Cancelled",
  partially_refunded: "Partially Refunded",
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  none: "Not Booked",
  not_booked: "Not Booked",
  booking_in_progress: "Booking in Progress",
  pending: "Awaiting Pickup",
  pickup_pending: "Awaiting Pickup",
  booked: "Booked",
  created: "Booked",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  partial_delivered: "Partially Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  hold: "On Hold",
  in_review: "Awaiting Pickup (In Review)",
  failed: "Booking Failed",
};

export const COURIER_SETTLEMENT_LABELS: Record<string, string> = {
  none: "Not Applicable",
  expected: "Expected",
  collected: "Collected",
  settled: "Settled",
  discrepancy: "Discrepancy",
};

/**
 * Valid state machine transitions for Stage 2 & Stage 6.
 * Backward status jumps (e.g. delivered -> pending, cancelled -> shipped) are rejected.
 */
export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["confirmed", "processing", "cancelled", "on-hold", "failed"],
  "on-hold": ["pending", "confirmed", "processing", "cancelled", "failed"],
  confirmed: ["processing", "ready_to_ship", "shipped", "cancelled"],
  processing: ["ready_to_ship", "shipped", "cancelled", "on-hold"],
  ready_to_ship: ["shipped", "processing", "cancelled"],
  shipped: ["delivered", "completed", "returned", "cancelled"],
  delivered: ["returned", "completed", "refunded"],
  completed: ["returned", "refunded"],
  cancelled: [],
  returned: ["refunded"],
  refunded: [],
  failed: ["pending", "confirmed", "cancelled"],
};

export function normalizeOrderStatus(status: string | null | undefined): string {
  const s = String(status || "pending").trim().toLowerCase();
  if (!s) return "pending";
  return s;
}

export function canTransitionOrderStatus(
  currentStatus: string | null | undefined,
  nextStatus: string | null | undefined
): boolean {
  const from = normalizeOrderStatus(currentStatus);
  const to = normalizeOrderStatus(nextStatus);
  if (from === to) return true;
  const allowed = ALLOWED_ORDER_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getAllowedNextStatuses(currentStatus: string | null | undefined): string[] {
  const from = normalizeOrderStatus(currentStatus);
  return [...(ALLOWED_ORDER_STATUS_TRANSITIONS[from] || [])];
}

export interface OrderFinancialInput {
  total?: number | null;
  subtotal?: number | null;
  shippingFee?: number | null;
  discount?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paidAmount?: number | null;
  expectedCodAmount?: number | null;
  collectedCodAmount?: number | null;
  settledCodAmount?: number | null;
  courierCharge?: number | null;
  codSettlementStatus?: string | null;
}

export interface ComputedOrderFinancials {
  orderTotal: number;
  advancePaidAmount: number;
  outstandingAmount: number;
  codAmountToCollect: number;
  isPrepaidVerified: boolean;
  isPartiallyPaid: boolean;
  expectedCodAmount: number;
  collectedCodAmount: number;
  settledCodAmount: number;
  courierCharge: number;
  /** Positive = courier remitted less than (collected - charge); negative = over-remitted. */
  discrepancyAmount: number;
  codSettlementStatus: "none" | "expected" | "collected" | "settled" | "discrepancy";
}

function roundMoney(n: unknown): number {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num * 100) / 100);
}

/**
 * Rules 4, 5, 6 & Stage 5 COD math:
 * - Rule 5: Verified online prepaid orders (`paymentStatus === "paid"`) ALWAYS have zero COD.
 * - Rule 6: Partially paid orders (`paidAmount > 0 && paidAmount < total`) calculate remaining COD = total - paidAmount.
 * - Rule 4: COD is strictly derived from outstanding collectible balance.
 * - Rule 1 / Cancelled / Refunded / Failed: collectible COD for courier booking = 0.
 */
export function computeOrderFinancials(input: OrderFinancialInput): ComputedOrderFinancials {
  const orderTotal = roundMoney(input.total);
  const paymentStatus = String(input.paymentStatus || "pending").trim().toLowerCase();
  const paymentMethod = String(input.paymentMethod || "cod").trim().toLowerCase();
  const orderStatus = normalizeOrderStatus(input.orderStatus);

  let advancePaidAmount = roundMoney(input.paidAmount);
  if (paymentStatus === "paid") {
    advancePaidAmount = orderTotal;
  } else if (advancePaidAmount > orderTotal) {
    advancePaidAmount = orderTotal;
  }

  const outstandingAmount = roundMoney(Math.max(0, orderTotal - advancePaidAmount));
  const isPrepaidVerified = paymentStatus === "paid" || (orderTotal > 0 && outstandingAmount === 0);
  const isPartiallyPaid =
    !isPrepaidVerified && (paymentStatus === "partially_paid" || advancePaidAmount > 0);

  const isTerminalNonCollectible =
    orderStatus === "cancelled" ||
    orderStatus === "refunded" ||
    orderStatus === "failed" ||
    paymentStatus === "refunded" ||
    paymentStatus === "cancelled";

  let codAmountToCollect = 0;
  if (!isTerminalNonCollectible && !isPrepaidVerified) {
    codAmountToCollect = outstandingAmount;
  }

  const expectedCodAmount =
    input.expectedCodAmount !== undefined && input.expectedCodAmount !== null && input.expectedCodAmount > 0
      ? roundMoney(input.expectedCodAmount)
      : codAmountToCollect;

  const collectedCodAmount = roundMoney(input.collectedCodAmount);
  const settledCodAmount = roundMoney(input.settledCodAmount);
  const courierCharge = roundMoney(input.courierCharge);

  // Discrepancy compares what courier collected (or expected if not recorded yet) minus courier fee vs settled remittance.
  const settlementBasis =
    collectedCodAmount > 0 ? collectedCodAmount : expectedCodAmount;
  const rawStatus = String(input.codSettlementStatus || "").trim().toLowerCase();

  let codSettlementStatus: ComputedOrderFinancials["codSettlementStatus"] = "none";
  if (rawStatus === "settled" || rawStatus === "discrepancy" || rawStatus === "collected" || rawStatus === "expected") {
    codSettlementStatus = rawStatus;
  } else if (codAmountToCollect > 0 || (paymentMethod === "cod" && !isTerminalNonCollectible)) {
    codSettlementStatus = "expected";
  }

  const netExpectedRemittance = Math.max(0, settlementBasis - courierCharge);
  const discrepancyAmount =
    codSettlementStatus === "settled" || codSettlementStatus === "discrepancy" || settledCodAmount > 0
      ? Math.round((netExpectedRemittance - settledCodAmount) * 100) / 100
      : 0;

  return {
    orderTotal,
    advancePaidAmount,
    outstandingAmount,
    codAmountToCollect,
    isPrepaidVerified,
    isPartiallyPaid,
    expectedCodAmount,
    collectedCodAmount,
    settledCodAmount,
    courierCharge,
    discrepancyAmount,
    codSettlementStatus,
  };
}

/**
 * Rules 1, 2, 3, 7 — Server-side eligibility gate for creating a courier booking.
 * Notice: `pending` (unconfirmed), `cancelled`, `returned`, `refunded`, `failed`,
 * and already-completed orders are blocked unless overridden only through valid confirmation first.
 */
export const COURIER_BOOKING_ELIGIBLE_ORDER_STATUSES = [
  "confirmed",
  "processing",
  "ready_to_ship",
] as const;

export function checkCourierBookingEligibility(args: {
  orderStatus?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  paidAmount?: number | null;
  total?: number | null;
  shipmentStatus?: string | null;
  shipmentBookingState?: string | null;
  consignmentId?: string | null;
  hasActiveShipmentRow?: boolean;
}): { ok: true } | { ok: false; code: string; status: number; reason: string } {
  const orderStatus = normalizeOrderStatus(args.orderStatus);
  const bookingState = String(args.shipmentBookingState || "not_booked").toLowerCase();
  const shipmentStatus = String(args.shipmentStatus || "none").toLowerCase();
  const paymentMethod = String(args.paymentMethod || "").trim().toLowerCase();
  const paymentStatus = String(args.paymentStatus || "").trim().toLowerCase();

  // Rule 1: Cancelled orders cannot be booked
  if (orderStatus === "cancelled" || orderStatus === "refunded") {
    return {
      ok: false,
      code: "ORDER_CANCELLED",
      status: 400,
      reason: "Cancelled or refunded orders cannot be booked with a courier.",
    };
  }

  // Rule 1b: Refunded payments cannot be booked
  if (paymentStatus === "refunded" || paymentStatus === "refund_pending") {
    return {
      ok: false,
      code: "PAYMENT_REFUNDED",
      status: 400,
      reason: "Refunded orders cannot be booked with a courier.",
    };
  }

  // Payment Eligibility Rules (Section 4):
  // Online payment pending or failed blocks courier booking
  if (paymentMethod && paymentMethod !== "cod") {
    if (paymentStatus === "pending" || paymentStatus === "unpaid" || paymentStatus === "advance_pending") {
      return {
        ok: false,
        code: "ONLINE_PAYMENT_PENDING",
        status: 409,
        reason: "Online payment is pending verification. Booking is blocked until payment is confirmed or switched to COD.",
      };
    }
    if (paymentStatus === "failed" || paymentStatus === "cancelled") {
      return {
        ok: false,
        code: "ONLINE_PAYMENT_FAILED",
        status: 409,
        reason: "Online payment failed or was cancelled. Booking is blocked until payment succeeds or order is switched to COD.",
      };
    }
  }

  // Rule 2: Unconfirmed orders cannot be booked
  if (orderStatus === "pending" || orderStatus === "on-hold" || orderStatus === "failed") {
    return {
      ok: false,
      code: "ORDER_UNCONFIRMED",
      status: 400,
      reason: "Order must be confirmed (Confirmed, Processing, or Ready to Ship) before booking a courier.",
    };
  }

  // Rule 3: Only eligible orders can be shipped
  if (
    !COURIER_BOOKING_ELIGIBLE_ORDER_STATUSES.includes(
      orderStatus as (typeof COURIER_BOOKING_ELIGIBLE_ORDER_STATUSES)[number]
    )
  ) {
    return {
      ok: false,
      code: "ORDER_NOT_ELIGIBLE",
      status: 400,
      reason: `Orders in "${ORDER_STATUS_LABELS[orderStatus] || orderStatus}" status are not eligible for courier booking.`,
    };
  }

  // Rule 7 & 8: Prevent duplicate or concurrent in-flight bookings
  if (bookingState === "booking_in_progress") {
    return {
      ok: false,
      code: "BOOKING_IN_PROGRESS",
      status: 409,
      reason: "A courier booking request is already in progress for this order. Refresh or sync status before retrying.",
    };
  }

  if (bookingState === "cancellation_pending") {
    return {
      ok: false,
      code: "CANCELLATION_PENDING",
      status: 409,
      reason: "Shipment cancellation is pending for this order.",
    };
  }

  const isShipmentCancelled =
    shipmentStatus === "cancelled" || bookingState === "cancelled";

  if (
    !isShipmentCancelled &&
    (args.hasActiveShipmentRow || Boolean(args.consignmentId && String(args.consignmentId).trim()))
  ) {
    return {
      ok: false,
      code: "DUPLICATE_SHIPMENT",
      status: 409,
      reason: "An active courier consignment already exists for this order.",
    };
  }

  return { ok: true };
}

export interface ReopenOrderInput {
  orderStatus?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  total?: number | null;
  paidAmount?: number | null;
  consignmentId?: string | null;
  shipmentStatus?: string | null;
  shipmentBookingState?: string | null;
  hasActiveShipment?: boolean;
  hasVerifiedPaymentTxn?: boolean;
  isRefunded?: boolean;
}

export type ReopenOrderEligibilityResult =
  | {
      eligible: true;
      targetOrderStatus: "pending" | "confirmed";
      targetPaymentStatus: string;
      shouldRestoreCodBalance: boolean;
      requiresVerifiedGatewayCheck: boolean;
      summary: string;
    }
  | {
      eligible: false;
      code:
        | "NOT_CANCELLED"
        | "ACTIVE_CONSIGNMENT_EXISTS"
        | "PAYMENT_REFUNDED_LOCKED"
        | "UNVERIFIED_PAID_GATEWAY";
      reason: string;
    };

/**
 * Reopen Cancelled Orders Recovery Engine.
 *
 * Pre-conditions enforced:
 * 1. Order must currently be cancelled.
 * 2. No active consignment exists (or courier cancellation verified).
 * 3. Verified gateway transaction and refund history check.
 * 4. Unpaid online orders restore to Pending with payment Pending (never auto-switched to COD).
 * 5. Reopening NEVER automatically creates a payment or shipment.
 */
export function evaluateReopenOrderEligibility(
  input: ReopenOrderInput
): ReopenOrderEligibilityResult {
  const currentStatus = normalizeOrderStatus(input.orderStatus);
  if (currentStatus !== "cancelled") {
    return {
      eligible: false,
      code: "NOT_CANCELLED",
      reason: `Only cancelled orders can be reopened (current order status is "${ORDER_STATUS_LABELS[currentStatus] || currentStatus}").`,
    };
  }

  // Pre-condition 1: Check active consignment / shipment
  const isShipmentCancelled =
    input.shipmentStatus === "cancelled" ||
    input.shipmentBookingState === "cancelled" ||
    input.shipmentStatus === "none" ||
    !input.shipmentStatus;

  if (
    input.hasActiveShipment ||
    (!isShipmentCancelled && Boolean(input.consignmentId && String(input.consignmentId).trim()))
  ) {
    return {
      eligible: false,
      code: "ACTIVE_CONSIGNMENT_EXISTS",
      reason:
        "Cannot reopen order: an active courier consignment exists. You must cancel or verify courier cancellation before reopening.",
    };
  }

  const paymentStatus = String(input.paymentStatus || "pending").toLowerCase();
  const paymentMethod = String(input.paymentMethod || "cod").toLowerCase();

  // Pre-condition 2: Refund verification
  if (input.isRefunded || paymentStatus === "refunded" || paymentStatus === "refund_pending") {
    return {
      eligible: false,
      code: "PAYMENT_REFUNDED_LOCKED",
      reason:
        "Cannot reopen order directly: payment has been refunded or refund is pending. A new order or new transaction is required.",
    };
  }

  // Pre-condition 3: Paid online order recovery
  if (paymentStatus === "paid") {
    if (paymentMethod !== "cod" && input.hasVerifiedPaymentTxn === false) {
      return {
        eligible: false,
        code: "UNVERIFIED_PAID_GATEWAY",
        reason:
          "Cannot restore as Paid: no verified gateway transaction found for this online payment.",
      };
    }
    return {
      eligible: true,
      targetOrderStatus: "confirmed",
      targetPaymentStatus: "paid",
      shouldRestoreCodBalance: false,
      requiresVerifiedGatewayCheck: paymentMethod !== "cod",
      summary:
        "Order was previously paid online and verified. Restoring order status to Confirmed with payment status Paid.",
    };
  }

  // Pre-condition 4: Unpaid online order recovery
  if (paymentMethod !== "cod") {
    return {
      eligible: true,
      targetOrderStatus: "pending",
      targetPaymentStatus: "pending",
      shouldRestoreCodBalance: false,
      requiresVerifiedGatewayCheck: false,
      summary:
        "Order was unpaid online. Restoring order status to Pending and keeping payment status as Pending (without switching to COD).",
    };
  }

  // Pre-condition 5: COD order recovery
  return {
    eligible: true,
    targetOrderStatus: "pending",
    targetPaymentStatus: "pending",
    shouldRestoreCodBalance: true,
    requiresVerifiedGatewayCheck: false,
    summary:
      "COD order cancelled before fulfillment. Restoring order status to Pending and reinstating expected COD amount.",
  };
}
