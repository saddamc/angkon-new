import { Order } from "@/models/Order";
import { CourierLog } from "@/models/CourierLog";
import type { IShipment } from "@/models/Shipment";
import { commitStockForOrder, releaseStockForOrder } from "@/server/products/stock";
import { computeOrderFinancials } from "@/server/orders/workflow";
import {
  evaluateShipmentTransition,
  isDeliveredStatus,
  type ShipmentStatus,
  type TransitionEvaluation,
} from "../providers/steadfast/utils";

export { evaluateShipmentTransition, type TransitionEvaluation };

function sanitizeRaw(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const clone = { ...(raw as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (/api[-_]?key|secret|token|authorization/i.test(key)) delete clone[key];
  }
  return clone;
}

export interface ApplyCourierStatusResult {
  changed: boolean;
  rejected?: boolean;
  idempotent?: boolean;
  reason?: string;
}

/**
 * Applies a courier status update to Shipment and Order with comprehensive
 * transition evaluation and audit recording.
 */
export async function applyCourierStatus(
  shipment: IShipment,
  status: ShipmentStatus,
  raw?: Record<string, unknown>,
  rawStatus?: string,
  options?: { isCourierVerifiedSync?: boolean }
): Promise<ApplyCourierStatusResult> {
  const now = new Date();
  const evaluation = evaluateShipmentTransition(shipment.status, status, {
    isCourierVerifiedSync: options?.isCourierVerifiedSync ?? true,
  });

  // ── Handle Rejected Transitions ──────────────────────────────────────────
  if (!evaluation.allowed) {
    const rejectionNote = `Rejected transition: ${shipment.status} -> ${status} (${evaluation.reason})`;
    shipment.events.push({
      status: shipment.status,
      at: now,
      note: rejectionNote,
      raw: sanitizeRaw(raw),
    });
    shipment.lastSyncedAt = now;
    await shipment.save();

    try {
      await CourierLog.create({
        provider: shipment.provider,
        action: "status_sync",
        orderId: shipment.orderId,
        orderNumber: shipment.orderNumber,
        consignmentId: shipment.consignmentId || "",
        ok: false,
        message: rejectionNote,
        actor: "courier_sync",
      });
    } catch (err) {
      console.warn("[CourierSync] Failed to write rejection CourierLog:", err);
    }

    return { changed: false, rejected: true, reason: evaluation.reason };
  }

  // ── Handle Idempotent Duplicate Status ───────────────────────────────────
  if (evaluation.idempotent) {
    shipment.lastSyncedAt = now;
    shipment.error = null;
    const safeRaw = sanitizeRaw(raw);
    if (safeRaw) shipment.rawResponse = safeRaw;
    await shipment.save();
    return { changed: false, idempotent: true, reason: evaluation.reason };
  }

  // ── Handle Accepted Transition ───────────────────────────────────────────
  const previousStatus = shipment.status;
  shipment.status = status;
  shipment.events.push({
    status,
    at: now,
    note: rawStatus ? `${rawStatus} (${evaluation.reason})` : evaluation.reason,
    raw: sanitizeRaw(raw),
  });

  shipment.lastSyncedAt = now;
  shipment.error = null;
  const safeRaw = sanitizeRaw(raw);
  if (safeRaw) shipment.rawResponse = safeRaw;
  await shipment.save();

  try {
    await CourierLog.create({
      provider: shipment.provider,
      action: "status_sync",
      orderId: shipment.orderId,
      orderNumber: shipment.orderNumber,
      consignmentId: shipment.consignmentId || "",
      ok: true,
      message: `Accepted transition from ${previousStatus} to ${status} (${evaluation.reason}).`,
      actor: "courier_sync",
    });
  } catch (err) {
    console.warn("[CourierSync] Failed to write accepted CourierLog:", err);
  }

  const orderUpdate: Record<string, unknown> = {
    shipmentStatus: status,
    providerStatus: rawStatus || String(status),
    courier: shipment.provider,
    consignmentId: shipment.consignmentId || "",
    trackingCode: shipment.trackingCode || "",
    trackingUrl: shipment.trackingCode
      ? `https://steadfast.com.bd/t/${encodeURIComponent(shipment.trackingCode)}`
      : null,
  };

  const order = await Order.findById(shipment.orderId);
  if (!order) return { changed: true, reason: evaluation.reason };

  if (status === "cancelled") {
    orderUpdate.shipmentBookingState = "cancelled";
    if (order.paymentStatus !== "paid") {
      orderUpdate.codSettlementStatus = "none";
    }
  } else if (status === "failed" || status === "booking_failed") {
    orderUpdate.shipmentBookingState = "booking_failed";
  } else if (shipment.consignmentId || shipment.trackingCode) {
    orderUpdate.shipmentBookingState = "booked";
  }

  let nextOrderStatus: string | null = null;
  const currentOrderStatus = String(order.orderStatus || "pending");

  if (status === "cancelled") {
    if (currentOrderStatus === "shipped") {
      nextOrderStatus = "ready_to_ship";
      orderUpdate.orderStatus = "ready_to_ship";
    }
  } else if (isDeliveredStatus(status)) {
    if (
      ["pending", "confirmed", "processing", "ready_to_ship", "shipped", "on-hold"].includes(
        currentOrderStatus
      )
    ) {
      nextOrderStatus = "delivered";
      orderUpdate.orderStatus = "delivered";
    }

    // Rule 10: Customer paid COD upon delivery -> collected by courier, NOT yet settled with merchant.
    if (shipment.codAmount > 0) {
      const financials = computeOrderFinancials(order);
      if (order.paymentStatus !== "paid") {
        orderUpdate.paymentStatus = "paid";
        orderUpdate.paidAt = order.paidAt || now;
      }
      orderUpdate.paidAmount = Math.max(financials.advancePaidAmount, financials.orderTotal);
      orderUpdate.collectedCodAmount = shipment.codAmount;
      if (
        order.codSettlementStatus !== "settled" &&
        order.codSettlementStatus !== "discrepancy"
      ) {
        orderUpdate.codSettlementStatus = "collected";
      }
    }
  } else if (
    status === "picked_up" ||
    status === "in_transit" ||
    status === "out_for_delivery" ||
    status === "partial_delivered"
  ) {
    if (
      ["pending", "confirmed", "processing", "ready_to_ship", "on-hold"].includes(
        currentOrderStatus
      )
    ) {
      nextOrderStatus = "shipped";
      orderUpdate.orderStatus = "shipped";
    }
  } else if (
    status === "in_review" ||
    status === "booked" ||
    status === "pickup_pending" ||
    status === "created" ||
    status === "pending"
  ) {
    // Automated sync: Consignment booked -> Order stays Ready to Ship (awaiting physical pickup)
    if (["pending", "confirmed", "processing"].includes(currentOrderStatus)) {
      nextOrderStatus = "ready_to_ship";
      orderUpdate.orderStatus = "ready_to_ship";
    }
  } else if (status === "returned" || status === "return_initiated") {
    // Support legitimate returns from any active or delivered order status
    if (["shipped", "delivered", "completed", "ready_to_ship", "processing", "confirmed"].includes(currentOrderStatus)) {
      nextOrderStatus = "returned";
      orderUpdate.orderStatus = "returned";
    }
  }

  const updateOps: Record<string, unknown> = { $set: orderUpdate };
  if (nextOrderStatus && nextOrderStatus !== currentOrderStatus) {
    updateOps.$push = {
      statusHistory: {
        status: nextOrderStatus,
        previousStatus: currentOrderStatus,
        actor: "courier",
        note: `${shipment.provider} status: ${rawStatus || status} (${evaluation.reason})`,
        source: "courier_sync",
        at: now,
      },
    };
  }

  await Order.updateOne({ _id: order._id }, updateOps);

  if (isDeliveredStatus(status)) {
    await commitStockForOrder(order);
  } else if (status === "returned") {
    await releaseStockForOrder(order);
  }

  return { changed: true, reason: evaluation.reason };
}
