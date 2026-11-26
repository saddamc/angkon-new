import mongoose from "mongoose";
import { Order, type IOrder } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { releaseStockForOrder } from "@/server/products/stock";
import { computeOrderRefundSummary } from "@/server/payments/services/order-refund-summary.service";
import { ProcessRefundService } from "@/server/payments/services/process-refund";
import {
  CUSTOMER_CANCELLABLE_ORDER_STATUSES,
  evaluateCustomerCancellationEligibility,
} from "@/server/orders/workflow";

const ADMIN_CANCELABLE_ORDER_STATUSES = [
  "pending",
  "on-hold",
  "confirmed",
  "processing",
  "ready_to_ship",
  "failed",
] as const;
const TERMINAL_SHIPMENT_STATUSES = [
  "cancelled",
  "failed",
  "returned",
  "delivered",
  "partial_delivered",
] as const;
const IN_TRANSIT_SHIPMENT_STATUSES = [
  "picked_up",
  "in_transit",
  "out_for_delivery",
] as const;

export type CancellationActorType = "customer" | "admin";
export type CancellationDecision = "cancel_only" | "cancel_and_refund";

export class OrderCancellationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 409,
  ) {
    super(message);
    this.name = "OrderCancellationError";
  }
}

export interface CancellationEligibility {
  customerCanRequest: boolean;
  canWithdraw: boolean;
  adminCanCancel: boolean;
  requestPending: boolean;
  activeShipment: boolean;
  requiresCourierResolution: boolean;
  requiresReturnWorkflow: boolean;
  mode: "instant" | "request" | "none";
  customerNotice: string | null;
  code?: string;
  message?: string;
}

export interface CancellationRequestResult {
  order: IOrder;
  autoAccepted: boolean;
  eligibility: CancellationEligibility;
}

function cleanReason(reason: unknown): string {
  const value = typeof reason === "string" ? reason.trim().slice(0, 300) : "";
  if (value.length < 3) {
    throw new OrderCancellationError(
      "A cancellation reason of at least 3 characters is required.",
      "CANCELLATION_REASON_REQUIRED",
      400,
    );
  }
  return value;
}

async function findOrder(idOrNumber: string) {
  const clean = String(idOrNumber || "").trim();
  if (!clean) return null;
  const query = mongoose.Types.ObjectId.isValid(clean)
    ? { $or: [{ _id: clean }, { orderNumber: clean }] }
    : { orderNumber: clean };
  return Order.findOne(query);
}

async function findActiveShipment(orderId: mongoose.Types.ObjectId) {
  return Shipment.findOne({
    orderId,
    status: { $nin: TERMINAL_SHIPMENT_STATUSES },
  })
    .sort({ createdAt: -1 })
    .lean();
}

function assertCustomerOwnsOrder(
  order: Pick<IOrder, "userId" | "customer">,
  customerId: string,
  customerEmail?: string | null,
) {
  const ownsByAccount = Boolean(
    order.userId && String(order.userId) === String(customerId),
  );
  const ownsByVerifiedEmail = Boolean(
    !order.userId &&
      customerEmail &&
      order.customer?.email &&
      String(order.customer.email).trim().toLowerCase() ===
        String(customerEmail).trim().toLowerCase(),
  );
  if (!ownsByAccount && !ownsByVerifiedEmail) {
    throw new OrderCancellationError(
      "You do not have access to this order.",
      "ORDER_FORBIDDEN",
      403,
    );
  }
}

export function getCancellationEligibility(
  order: Pick<
    IOrder,
    | "orderStatus"
    | "paymentMethod"
    | "paymentStatus"
    | "paidAmount"
    | "shipmentStatus"
    | "shipmentBookingState"
    | "consignmentId"
    | "trackingCode"
    | "cancellationRequest"
  >,
  activeShipment?: {
    status?: string | null;
    consignmentId?: string | null;
    trackingCode?: string | null;
  } | null,
): CancellationEligibility {
  const orderStatus = String(order.orderStatus || "").toLowerCase();
  const shipmentStatus = String(
    activeShipment?.status || order.shipmentStatus || "not_booked",
  ).toLowerCase();
  const bookingState = String(order.shipmentBookingState || "not_booked").toLowerCase();
  const requestPending = order.cancellationRequest?.status === "requested";

  // Customer eligibility follows the strict pre-processing & non-booked rule
  const customerDecision = evaluateCustomerCancellationEligibility(order, activeShipment);

  if (orderStatus === "cancelled" || orderStatus === "refunded") {
    return {
      customerCanRequest: false,
      canWithdraw: false,
      adminCanCancel: false,
      requestPending,
      activeShipment: false,
      requiresCourierResolution: false,
      requiresReturnWorkflow: false,
      mode: "none",
      customerNotice: customerDecision.customerNotice,
      code: "ORDER_CANCELLED_LOCKED",
      message: "This order is already closed and cannot be cancelled again.",
    };
  }

  if (
    ["delivered", "completed", "returned"].includes(orderStatus) ||
    ["delivered", "partial_delivered"].includes(shipmentStatus)
  ) {
    return {
      customerCanRequest: false,
      canWithdraw: false,
      adminCanCancel: false,
      requestPending,
      activeShipment: true,
      requiresCourierResolution: false,
      requiresReturnWorkflow: true,
      mode: "none",
      customerNotice: customerDecision.customerNotice,
      code: "DELIVERED_REQUIRES_RETURN_WORKFLOW",
      message: "This parcel is delivered. Use the return and refund workflow instead of cancellation.",
    };
  }

  if (
    IN_TRANSIT_SHIPMENT_STATUSES.includes(
      shipmentStatus as (typeof IN_TRANSIT_SHIPMENT_STATUSES)[number],
    )
  ) {
    return {
      customerCanRequest: false,
      canWithdraw: false,
      adminCanCancel: false,
      requestPending,
      activeShipment: true,
      requiresCourierResolution: true,
      requiresReturnWorkflow: true,
      mode: "none",
      customerNotice: customerDecision.customerNotice,
      code: "SHIPMENT_IN_TRANSIT",
      message: "The parcel is already with the courier. Request a return or recall first.",
    };
  }

  if (bookingState === "booking_in_progress" || shipmentStatus === "booking_pending") {
    return {
      customerCanRequest: false,
      canWithdraw: false,
      adminCanCancel: false,
      requestPending,
      activeShipment: true,
      requiresCourierResolution: true,
      requiresReturnWorkflow: false,
      mode: "none",
      customerNotice: customerDecision.customerNotice,
      code: "BOOKING_IN_PROGRESS",
      message: "Courier booking is still being reconciled. Try again after it reaches a final state.",
    };
  }

  const active =
    Boolean(activeShipment) ||
    (!TERMINAL_SHIPMENT_STATUSES.includes(
      shipmentStatus as (typeof TERMINAL_SHIPMENT_STATUSES)[number],
    ) &&
      shipmentStatus !== "not_booked" &&
      shipmentStatus !== "none" &&
      shipmentStatus !== "booking_failed");

  if (active) {
    const isUnknown = shipmentStatus === "unknown";
    const trackingRef =
      activeShipment?.consignmentId ||
      activeShipment?.trackingCode ||
      order.consignmentId ||
      order.trackingCode ||
      "";
    return {
      customerCanRequest: false,
      canWithdraw: false,
      adminCanCancel: false,
      requestPending,
      activeShipment: true,
      requiresCourierResolution: true,
      requiresReturnWorkflow: false,
      mode: "none",
      customerNotice: customerDecision.customerNotice,
      code: isUnknown ? "CONSIGNMENT_STATUS_UNKNOWN" : "ACTIVE_CONSIGNMENT_EXISTS",
      message: isUnknown
        ? `Consignment ${trackingRef} reported an unknown courier status — this commonly means the parcel was cancelled in the Steadfast portal. Use "Mark Consignment Cancelled (portal)" first, then cancel the order.`
        : `Consignment ${trackingRef} is still active. Cancel it from the Shipment tab first, then cancel the order.`,
    };
  }

  if (
    !ADMIN_CANCELABLE_ORDER_STATUSES.includes(
      orderStatus as (typeof ADMIN_CANCELABLE_ORDER_STATUSES)[number],
    )
  ) {
    return {
      customerCanRequest: false,
      canWithdraw: false,
      adminCanCancel: false,
      requestPending,
      activeShipment: false,
      requiresCourierResolution: false,
      requiresReturnWorkflow: false,
      mode: "none",
      customerNotice: customerDecision.customerNotice,
      code: "ORDER_NOT_CANCELLABLE",
      message: "This order is no longer in a cancellable preparation state.",
    };
  }

  return {
    customerCanRequest: customerDecision.canCancel,
    canWithdraw: customerDecision.canWithdraw,
    adminCanCancel: true,
    requestPending,
    activeShipment: false,
    requiresCourierResolution: false,
    requiresReturnWorkflow: false,
    mode: customerDecision.mode,
    customerNotice: customerDecision.customerNotice,
    code: customerDecision.code,
    message: customerDecision.canCancel ? undefined : customerDecision.message,
  };
}

/**
 * Customer self-service cancellation entry point.
 *
 * Rules enforced on the server:
 * - Only pre-processing orders (`pending`, `on-hold`, `confirmed`) WITHOUT any
 *   booked/active/in-progress courier shipment can be cancelled by the customer.
 * - Unpaid orders (no captured money) are cancelled immediately (`autoAccepted: true`)
 *   with stock release and COD reset.
 * - Captured/paid orders create a `cancellationRequest` with `status: "requested"`
 *   so an administrator reviews and executes the real gateway/manual refund.
 */
export async function requestCustomerCancellation(input: {
  orderIdOrNumber: string;
  customerId: string;
  customerEmail?: string | null;
  reason: string;
  reasonCode?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<CancellationRequestResult> {
  const reason = cleanReason(input.reason);
  const order = await findOrder(input.orderIdOrNumber);
  if (!order) throw new OrderCancellationError("Order not found.", "ORDER_NOT_FOUND", 404);

  assertCustomerOwnsOrder(order, input.customerId, input.customerEmail);

  const activeShipment = await findActiveShipment(order._id);
  const eligibility = getCancellationEligibility(order, activeShipment);
  if (!eligibility.customerCanRequest) {
    throw new OrderCancellationError(
      eligibility.message || "This order can no longer be cancelled online.",
      eligibility.code || "ORDER_NOT_CANCELLABLE",
      409,
    );
  }

  const refundSummary = await computeOrderRefundSummary(order.orderNumber, order._id);
  const hasCapturedBalance =
    refundSummary.availableRefundableAmount > 0.009 ||
    ["paid", "partially_paid", "refund_pending"].includes(
      String(order.paymentStatus || "").toLowerCase(),
    ) ||
    (Number(order.paidAmount) || 0) > 0;

  const now = new Date();
  const reasonCode =
    typeof input.reasonCode === "string" && input.reasonCode.trim()
      ? input.reasonCode.trim().slice(0, 60)
      : null;

  // Path A: Unpaid pre-processing order with no courier booked -> instant self-cancel.
  if (!hasCapturedBalance) {
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        orderStatus: { $in: [...CUSTOMER_CANCELLABLE_ORDER_STATUSES] },
        "cancellationRequest.status": { $ne: "requested" },
      },
      {
        $set: {
          orderStatus: "cancelled",
          expectedCodAmount: 0,
          ...(order.codSettlementStatus === "expected" ? { codSettlementStatus: "none" } : {}),
          cancellationDetails: {
            cancelledAt: now,
            cancelledBy: String(input.customerId || "customer"),
            reasonCode,
            reason,
            adminNote: null,
            decision: "cancel_only",
            refundId: null,
            refundOutcome: "not_required",
            courierDisposition: "not_booked",
          },
          cancellationRequest: {
            status: "approved",
            requestedAt: now,
            requestedBy: order.userId || input.customerId,
            reasonCode,
            reason,
            reviewedAt: now,
            reviewedBy: "system_self_cancel",
            reviewNote: "Automatically approved before warehouse processing started.",
          },
        },
        $push: {
          statusHistory: {
            status: "cancelled",
            previousStatus: order.orderStatus,
            actor: "customer",
            source: "customer_self_cancel",
            note: reason,
            at: now,
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new OrderCancellationError(
        "This order status changed before cancellation completed. Refresh and check the order status.",
        "CANCELLATION_REQUEST_CONFLICT",
      );
    }

    const stockResult = await releaseStockForOrder(updated);

    try {
      await AdminAuditLog.create({
        tenantId: "angkon-main",
        actor: String(input.customerId || "customer"),
        action: "order.cancellation.customer_self_cancelled",
        targetType: "order",
        targetId: updated.orderNumber,
        before: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
        after: { orderStatus: "cancelled", stockReleased: stockResult.released, reason },
        ip: input.ip || "",
        userAgent: input.userAgent || "",
      });
    } catch (auditErr) {
      console.warn("Audit log write failed on customer self-cancel:", auditErr);
    }

    return { order: updated, autoAccepted: true, eligibility };
  }

  // Path B: Paid / partially-paid pre-processing order -> queue admin review for refund.
  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      orderStatus: { $in: [...CUSTOMER_CANCELLABLE_ORDER_STATUSES] },
      "cancellationRequest.status": { $ne: "requested" },
    },
    {
      $set: {
        cancellationRequest: {
          status: "requested",
          requestedAt: now,
          requestedBy: order.userId || input.customerId,
          reasonCode,
          reason,
          reviewedAt: null,
          reviewedBy: null,
          reviewNote: null,
        },
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new OrderCancellationError(
      "A cancellation request is already pending or the order is already being processed. Refresh and try again.",
      "CANCELLATION_REQUEST_CONFLICT",
    );
  }

  return { order: updated, autoAccepted: false, eligibility };
}

/**
 * Allows a customer to withdraw a pending cancellation review request before
 * an administrator approves or rejects it.
 */
export async function withdrawCustomerCancellation(input: {
  orderIdOrNumber: string;
  customerId: string;
  customerEmail?: string | null;
}) {
  const order = await findOrder(input.orderIdOrNumber);
  if (!order) throw new OrderCancellationError("Order not found.", "ORDER_NOT_FOUND", 404);
  assertCustomerOwnsOrder(order, input.customerId, input.customerEmail);

  if (order.cancellationRequest?.status !== "requested") {
    throw new OrderCancellationError(
      "No pending cancellation request exists to withdraw.",
      "NO_PENDING_CANCELLATION",
      409,
    );
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, "cancellationRequest.status": "requested" },
    {
      $set: {
        "cancellationRequest.status": "withdrawn",
        "cancellationRequest.reviewedAt": new Date(),
        "cancellationRequest.reviewedBy": String(input.customerId || "customer"),
        "cancellationRequest.reviewNote": "Withdrawn by customer",
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new OrderCancellationError(
      "Cancellation request was already reviewed.",
      "CANCELLATION_REQUEST_CONFLICT",
      409,
    );
  }

  return updated;
}

export async function rejectCustomerCancellation(input: {
  orderIdOrNumber: string;
  reviewer: string;
  reviewNote: string;
}) {
  const note = cleanReason(input.reviewNote);
  const order = await findOrder(input.orderIdOrNumber);
  if (!order) throw new OrderCancellationError("Order not found.", "ORDER_NOT_FOUND", 404);
  if (order.cancellationRequest?.status !== "requested") {
    throw new OrderCancellationError(
      "There is no pending cancellation request to reject.",
      "NO_PENDING_CANCELLATION",
    );
  }
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, "cancellationRequest.status": "requested" },
    {
      $set: {
        "cancellationRequest.status": "rejected",
        "cancellationRequest.reviewedAt": new Date(),
        "cancellationRequest.reviewedBy": input.reviewer,
        "cancellationRequest.reviewNote": note,
      },
    },
    { new: true },
  );
  if (!updated) {
    throw new OrderCancellationError(
      "The request was already reviewed.",
      "CANCELLATION_REQUEST_CONFLICT",
    );
  }
  return updated;
}

export async function executeOrderCancellation(input: {
  orderIdOrNumber: string;
  actor: string;
  actorType: CancellationActorType;
  reason: string;
  reasonCode?: string | null;
  adminNote?: string | null;
  decision?: CancellationDecision;
  refundAmount?: number | null;
  manualRefund?: {
    method?: string | null;
    reference?: string | null;
    refundDate?: string | null;
    adminNote?: string | null;
  } | null;
  requirePendingRequest?: boolean;
  ip?: string;
  userAgent?: string;
}) {
  const reason = cleanReason(input.reason);
  const order = await findOrder(input.orderIdOrNumber);
  if (!order) throw new OrderCancellationError("Order not found.", "ORDER_NOT_FOUND", 404);
  if (input.requirePendingRequest && order.cancellationRequest?.status !== "requested") {
    throw new OrderCancellationError(
      "There is no pending cancellation request to approve.",
      "NO_PENDING_CANCELLATION",
    );
  }

  const activeShipment = await findActiveShipment(order._id);
  const eligibility = getCancellationEligibility(order, activeShipment);
  if (!eligibility.adminCanCancel) {
    throw new OrderCancellationError(
      eligibility.message || "This order cannot be cancelled.",
      eligibility.code || "ORDER_NOT_CANCELLABLE",
    );
  }

  const requestedRefund = input.decision === "cancel_and_refund";
  // Never close an order while captured money is left without a refund decision.
  // COD/unpaid orders have no captured balance and may use cancel_only.
  const refundSummary = await computeOrderRefundSummary(order.orderNumber, order._id);
  if (!requestedRefund && refundSummary.availableRefundableAmount > 0.009) {
    throw new OrderCancellationError(
      "This order has captured payment. Choose cancellation with refund so the payment remains traceable.",
      "REFUND_REQUIRED_FOR_CANCELLATION",
      400,
    );
  }
  const requestedRefundAmount = requestedRefund
    ? typeof input.refundAmount === "number" && Number.isFinite(input.refundAmount)
      ? Math.round(input.refundAmount * 100) / 100
      : refundSummary.availableRefundableAmount
    : 0;
  if (
    requestedRefund &&
    (requestedRefundAmount <= 0 || requestedRefundAmount > refundSummary.availableRefundableAmount + 0.01)
  ) {
    throw new OrderCancellationError(
      "Refund amount is outside the available captured balance.",
      "REFUND_AMOUNT_INVALID",
      400,
    );
  }

  const shipStatus = String(order.shipmentStatus || "not_booked").toLowerCase();
  const courierDisposition =
    shipStatus === "cancelled"
      ? "cancelled"
      : shipStatus === "return_initiated" || shipStatus === "returned"
        ? "return_requested"
        : activeShipment
          ? "portal_action_required"
          : "not_booked";

  const cleanAdminNote =
    typeof input.adminNote === "string" && input.adminNote.trim()
      ? input.adminNote.trim().slice(0, 500)
      : input.actorType === "admin"
        ? reason
        : null;

  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      orderStatus: { $in: [...ADMIN_CANCELABLE_ORDER_STATUSES] },
      ...(input.requirePendingRequest ? { "cancellationRequest.status": "requested" } : {}),
    },
    {
      $set: {
        orderStatus: "cancelled",
        expectedCodAmount: 0,
        ...(order.codSettlementStatus === "expected" ? { codSettlementStatus: "none" } : {}),
        cancellationDetails: {
          cancelledAt: new Date(),
          cancelledBy: input.actor,
          reasonCode: input.reasonCode || null,
          reason,
          adminNote: cleanAdminNote,
          decision: requestedRefund ? "cancel_and_refund" : "cancel_only",
          refundId: null,
          refundOutcome: null,
          courierDisposition,
        },
        ...(input.requirePendingRequest
          ? {
              "cancellationRequest.status": "approved",
              "cancellationRequest.reviewedAt": new Date(),
              "cancellationRequest.reviewedBy": input.actor,
            }
          : {}),
      },
      $push: {
        statusHistory: {
          status: "cancelled",
          previousStatus: order.orderStatus,
          actor: input.actor,
          source: input.actorType === "customer" ? "customer_cancellation" : "admin_cancellation",
          note: reason,
          at: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new OrderCancellationError(
      "The order changed before cancellation completed. Refresh and try again.",
      "CANCELLATION_REQUEST_CONFLICT",
    );
  }

  const stockResult = await releaseStockForOrder(updated);
  let refundResult: Record<string, unknown> | null = null;

  if (requestedRefund) {
    const gatewayAttempt = input.manualRefund
      ? null
      : refundSummary.eligibleGatewayAttempts.find(
          (attempt) =>
            attempt.available + 0.01 >= requestedRefundAmount &&
            attempt.bankTranId &&
            attempt.valId,
        );
    if (gatewayAttempt) {
      try {
        const gateway = await ProcessRefundService.initiateRefund({
          attemptId: gatewayAttempt.attemptId,
          amount: requestedRefundAmount,
          reason,
          requestedBy: input.actor,
          idempotencyKey: `cancel-${updated.orderNumber}`,
        });
        refundResult = {
          ok: gateway.ok,
          refundId: gateway.refundId,
          status: gateway.status,
          error: gateway.error,
        };
      } catch (error) {
        refundResult = {
          ok: false,
          status: "failed",
          error: error instanceof Error ? error.message : "Refund initiation failed.",
        };
      }
    } else if (input.manualRefund?.reference && requestedRefundAmount > 0) {
      const manual = await ProcessRefundService.recordManualRefund({
        orderNumber: updated.orderNumber,
        orderId: updated._id,
        amount: requestedRefundAmount,
        refundMethod: input.manualRefund.method || "manual_offline",
        externalReference: input.manualRefund.reference,
        refundDate: input.manualRefund.refundDate
          ? new Date(input.manualRefund.refundDate)
          : new Date(),
        reason,
        requestedBy: input.actor,
        adminNote: input.manualRefund.adminNote || undefined,
        idempotencyKey: `cancel-${updated.orderNumber}`,
        ip: input.ip,
        userAgent: input.userAgent,
      });
      refundResult = manual.ok
        ? { ok: true, refundId: manual.refundId, status: "succeeded" }
        : { ok: false, status: "failed", error: manual.error };
    } else if (requestedRefundAmount > 0) {
      refundResult = {
        ok: false,
        status: "manual_action_required",
        amount: requestedRefundAmount,
        error: "Captured funds require an administrator to record an offline refund.",
      };
    } else {
      refundResult = { ok: true, status: "not_required" };
    }

    await Order.updateOne(
      { _id: updated._id },
      {
        $set: {
          "cancellationDetails.refundId": refundResult?.refundId || null,
          "cancellationDetails.refundOutcome": refundResult?.status || null,
        },
      },
    );
  }

  await AdminAuditLog.create({
    tenantId: "angkon-main",
    actor: input.actor,
    action:
      input.actorType === "customer"
        ? "order.cancellation.request_approved"
        : "order.cancellation.cancelled",
    targetType: "order",
    targetId: updated.orderNumber,
    before: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
    after: {
      orderStatus: "cancelled",
      paymentStatus: updated.paymentStatus,
      stockReleased: stockResult.released,
      refundResult,
    },
    ip: input.ip || "",
    userAgent: input.userAgent || "",
  });

  return {
    order: (await Order.findById(updated._id).lean()) || updated.toObject(),
    stockResult,
    refundResult,
    eligibility,
  };
}

export async function getCancellationSnapshot(orderIdOrNumber: string) {
  const order = await findOrder(orderIdOrNumber);
  if (!order) throw new OrderCancellationError("Order not found.", "ORDER_NOT_FOUND", 404);
  const activeShipment = await findActiveShipment(order._id);
  return {
    order: order.toObject(),
    eligibility: getCancellationEligibility(order, activeShipment),
    activeShipment,
  };
}
