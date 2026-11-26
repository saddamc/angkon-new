import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { commitStockForOrder, releaseStockForOrder } from "@/server/products/stock";
import { clientIp } from "@/server/security/rate-limit";
import { tryAutoBookOnConfirm } from "@/server/courier/core/auto-book";
import { computeOrderRefundSummary } from "@/server/payments/services/order-refund-summary.service";
import { ProcessRefundService } from "@/server/payments/services/process-refund";
import {
  canTransitionOrderStatus,
  computeOrderFinancials,
  getAllowedNextStatuses,
  normalizeOrderStatus,
} from "@/server/orders/workflow";
import { isOnlinePaymentMethod } from "@/lib/payment-methods";
import { executeOrderCancellation, OrderCancellationError } from "@/server/orders/services/order-cancellation.service";

const ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "returned",
  "on-hold",
  "refunded",
  "failed",
]);

const PAYMENT_STATUSES = new Set([
  "pending",
  "partially_paid",
  "paid",
  "failed",
  "cancelled",
  "refund_pending",
  "refunded",
  "partially_refunded",
]);

async function findOrderByIdOrNumber(id: string) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ orderNumber: id }, { _id: id }] }
    : { orderNumber: id };
  return Order.findOne(query);
}

// GET /api/admin/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();
    const order = await findOrderByIdOrNumber(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const obj = order.toObject();
    const isSteadfastApi =
      obj.courier === "steadfast" &&
      Boolean(obj.consignmentId || obj.trackingCode) &&
      !["cancelled", "failed", "booking_failed"].includes(obj.shipmentStatus || "");

    const rawAllowed = getAllowedNextStatuses(obj.orderStatus);
    const allowedNextStatuses = isSteadfastApi
      ? rawAllowed.filter((s) => s !== "shipped" && s !== "delivered")
      : rawAllowed;

    return NextResponse.json(
      {
        ...obj,
        id: obj.orderNumber,
        status: obj.orderStatus,
        financials: computeOrderFinancials(obj),
        allowedNextStatuses,
        isSteadfastApiManaged: isSteadfastApi,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}

// PATCH /api/admin/orders/[id] — update order status/notes with strict workflow transitions & audit log
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ orderNumber: id }, { _id: id }] }
      : { orderNumber: id };

    const beforeOrder = await Order.findOne(query).lean();
    if (!beforeOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = {};
    let nextStatusNormalized: string | null = null;

    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !ORDER_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
      }
      nextStatusNormalized = normalizeOrderStatus(body.status);
      const currentStatusNormalized = normalizeOrderStatus(beforeOrder.orderStatus);

      if (currentStatusNormalized === "cancelled") {
        return NextResponse.json(
          {
            error:
              "Cancelled orders are locked from direct status edits. Use the dedicated Reopen Order action.",
            code: "ORDER_CANCELLED_LOCKED",
          },
          { status: 409 }
        );
      }

      // A payment can be recorded after a COD parcel was booked. The order's
      // balance then changes, but a submitted consignment keeps its original
      // collect amount. Never let staff mark that mismatched parcel shipped.
      if (
        ["ready_to_ship", "shipped"].includes(nextStatusNormalized) &&
        nextStatusNormalized !== currentStatusNormalized
      ) {
        const activeShipment = await Shipment.findOne({
          orderId: beforeOrder._id,
          status: {
            $nin: ["cancelled", "failed", "returned", "delivered", "partial_delivered"],
          },
        })
          .select("status consignmentId trackingCode codAmount provider")
          .sort({ createdAt: -1 })
          .lean();
        const orderForShippingFinancials =
          body.paymentStatus === "paid"
            ? { ...beforeOrder.toObject(), paymentStatus: "paid", paidAmount: beforeOrder.total }
            : beforeOrder;
        const currentCollectible =
          computeOrderFinancials(orderForShippingFinancials).codAmountToCollect;
        const courierCollectible = Math.max(0, Number(activeShipment?.codAmount) || 0);

        if (activeShipment && courierCollectible > currentCollectible + 0.009) {
          return NextResponse.json(
            {
              error: `Do not mark this order Ready to Ship or Shipped: courier consignment ${activeShipment.consignmentId || activeShipment.trackingCode || ""} is set to collect ৳${courierCollectible.toLocaleString("en-BD")}, but the current order balance is ৳${currentCollectible.toLocaleString("en-BD")}. Cancel the consignment in the courier portal and rebook it with the correct collection amount.`,
              code: "COURIER_COD_PAYMENT_MISMATCH",
              courierCodAmount: courierCollectible,
              currentCollectibleAmount: currentCollectible,
              consignmentId: activeShipment.consignmentId || null,
            },
            { status: 409 }
          );
        }
      }

      if (
        nextStatusNormalized !== currentStatusNormalized &&
        !canTransitionOrderStatus(currentStatusNormalized, nextStatusNormalized)
      ) {
        return NextResponse.json(
          {
            error: `Invalid status transition from "${currentStatusNormalized}" to "${nextStatusNormalized}".`,
            code: "INVALID_STATUS_TRANSITION",
            allowedNextStatuses: getAllowedNextStatuses(currentStatusNormalized),
          },
          { status: 409 }
        );
      }

      // Phase 8 Rule: For API-managed Steadfast shipments, do not allow manual Shipped or Delivered transitions
      const isSteadfastApi =
        beforeOrder.courier === "steadfast" &&
        Boolean(beforeOrder.consignmentId || beforeOrder.trackingCode) &&
        !["cancelled", "failed", "booking_failed"].includes(beforeOrder.shipmentStatus || "");

      if (
        isSteadfastApi &&
        (nextStatusNormalized === "shipped" || nextStatusNormalized === "delivered") &&
        !body.forceCourierOverride
      ) {
        return NextResponse.json(
          {
            error: `Order #${beforeOrder.orderNumber} is managed by Steadfast Courier API. "${nextStatusNormalized}" state is updated automatically via courier tracking. Operational statuses (Confirmed, Processing, Ready to Ship, Cancelled) remain editable.`,
            code: "COURIER_API_MANAGED",
          },
          { status: 409 }
        );
      }

      // Exceptional transitions require mandatory admin reason
      const isExceptional =
        nextStatusNormalized === "cancelled" ||
        nextStatusNormalized === "returned" ||
        nextStatusNormalized === "refunded";
      if (isExceptional && (!body.reason || typeof body.reason !== "string" || !body.reason.trim())) {
        return NextResponse.json(
          {
            error: `A mandatory admin reason is required when transitioning order to "${nextStatusNormalized}".`,
            code: "ADMIN_REASON_REQUIRED",
          },
          { status: 400 }
        );
      }

      // All admin cancellations use the shared guarded domain service used by
      // customer-request approvals. The legacy branch below remains as a
      // compatibility reference for existing response contracts.
      if (nextStatusNormalized === "cancelled") {
        const result = await executeOrderCancellation({
          orderIdOrNumber: id,
          actor: auth.user || "admin",
          actorType: "admin",
          reason: String(body.reason).trim(),
          reasonCode: typeof body.reasonCode === "string" ? body.reasonCode : null,
          adminNote: typeof body.adminNote === "string" ? body.adminNote : null,
          decision: body.cancelDecision === "cancel_only" ? "cancel_only" : "cancel_and_refund",
          refundAmount: body.refund && typeof body.refund.amount === "number" ? body.refund.amount : null,
          manualRefund:
            body.refund && typeof body.refund === "object" && body.refund.channel === "manual_offline"
              ? {
                  method: typeof body.refund.method === "string" ? body.refund.method : null,
                  reference: typeof body.refund.reference === "string" ? body.refund.reference : null,
                  refundDate: typeof body.refund.refundDate === "string" ? body.refund.refundDate : null,
                  adminNote: typeof body.adminNote === "string" ? body.adminNote : null,
                }
              : null,
          ip: clientIp(request),
          userAgent: request.headers.get("user-agent") || "",
        });
        return NextResponse.json({
          ok: true,
          status: result.order.orderStatus,
          paymentStatus: result.order.paymentStatus,
          payment_status: result.order.paymentStatus,
          order: result.order,
          refundResult: result.refundResult,
          stockResult: result.stockResult,
          orderCancelled: true,
        });
      }

      // Check active shipment conditions on cancellation
      if (nextStatusNormalized === "cancelled") {
        if (
          beforeOrder.shipmentBookingState === "booking_in_progress" ||
          beforeOrder.shipmentStatus === "booking_pending"
        ) {
          return NextResponse.json(
            {
              error:
                "Courier booking is currently in progress. Reconcile the booking status before cancelling this order.",
              code: "BOOKING_IN_PROGRESS",
            },
            { status: 409 }
          );
        }

        if (
          beforeOrder.shipmentStatus === "delivered" ||
          beforeOrder.shipmentStatus === "partial_delivered"
        ) {
          return NextResponse.json(
            {
              error:
                "Delivered parcels cannot be cancelled. Use the separate customer return/exchange workflow.",
              code: "DELIVERED_REQUIRES_RETURN_WORKFLOW",
            },
            { status: 409 }
          );
        }

        if (
          beforeOrder.shipmentStatus === "in_transit" ||
          beforeOrder.shipmentStatus === "out_for_delivery" ||
          beforeOrder.shipmentStatus === "picked_up"
        ) {
          return NextResponse.json(
            {
              error:
                "Cannot cancel order while parcel is in transit or out for delivery. Recall or cancel courier shipment first.",
              code: "SHIPMENT_IN_TRANSIT",
            },
            { status: 409 }
          );
        }

        // Never orphan a live consignment: the parcel must be cancelled (or
        // confirmed cancelled at the courier portal) before cancelling the order.
        const activeConsignment = await Shipment.findOne({
          orderId: beforeOrder._id,
          status: {
            $nin: ["cancelled", "failed", "returned", "delivered", "partial_delivered"],
          },
        })
          .select("status consignmentId trackingCode")
          .lean();

        if (activeConsignment) {
          // Steadfast reports "unknown" for consignments removed in the
          // merchant portal — give the admin the exact way out instead of a
          // generic "still active" dead end.
          if (String(activeConsignment.status) === "unknown") {
            return NextResponse.json(
              {
                error: `Consignment ${activeConsignment.consignmentId || activeConsignment.trackingCode || ""} reported an unknown courier status — this commonly means the parcel was cancelled in the Steadfast portal. Open the order's status modal or courier tab and use "Mark Consignment Cancelled (portal)", then cancel the order.`,
                code: "CONSIGNMENT_STATUS_UNKNOWN",
              },
              { status: 409 }
            );
          }
          return NextResponse.json(
            {
              error: `Consignment ${activeConsignment.consignmentId || activeConsignment.trackingCode || ""} is still active. Cancel it from the Shipment tab first, then cancel the order.`,
              code: "ACTIVE_CONSIGNMENT_EXISTS",
            },
            { status: 409 }
          );
        }

        // Pre-validate coordinated refund if requested
        if (body.cancelDecision === "cancel_and_refund" && body.refund) {
          const reqAmt = Number(body.refund.amount);
          if (!Number.isFinite(reqAmt) || reqAmt <= 0) {
            return NextResponse.json(
              { error: "Refund amount must be greater than zero.", code: "INVALID_REFUND_AMOUNT" },
              { status: 400 }
            );
          }
          const refundSummary = await computeOrderRefundSummary(
            beforeOrder.orderNumber,
            beforeOrder._id
          );
          if (reqAmt > refundSummary.availableRefundableAmount + 0.01) {
            return NextResponse.json(
              {
                error: `Requested refund amount ৳${reqAmt} exceeds available refundable balance of ৳${refundSummary.availableRefundableAmount.toFixed(2)}.`,
                code: "REFUND_AMOUNT_EXCEEDED",
              },
              { status: 400 }
            );
          }
        }
      }

      // Check shipped condition: cannot jump from pending/on-hold directly to shipped
      if (
        nextStatusNormalized === "shipped" &&
        ["pending", "on-hold"].includes(currentStatusNormalized)
      ) {
        return NextResponse.json(
          {
            error: "Order must be confirmed before marking as shipped.",
            code: "PRECONDITION_FAILED",
          },
          { status: 400 }
        );
      }

      updateFields.orderStatus = nextStatusNormalized;
    }

    if (body.paymentStatus !== undefined) {
      if (typeof body.paymentStatus !== "string" || !PAYMENT_STATUSES.has(body.paymentStatus)) {
        return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
      }
      // Rule: Online gateway orders must not be marked fully paid blindly without gateway/manual transaction proof.
      if (
        body.paymentStatus === "paid" &&
        isOnlinePaymentMethod(beforeOrder.paymentMethod) &&
        beforeOrder.paymentStatus !== "paid" &&
        !body.confirmOfflineCollection
      ) {
        return NextResponse.json(
          {
            error:
              "Online SSLCOMMERZ payments require gateway validation or explicit manual payment recording.",
            code: "ONLINE_PAYMENT_VALIDATION_REQUIRED",
          },
          { status: 409 }
        );
      }

      updateFields.paymentStatus = body.paymentStatus;
      if (body.paymentStatus === "paid") {
        updateFields.paidAt = new Date();
        updateFields.paidAmount = beforeOrder.total;
        updateFields.expectedCodAmount = 0;
        if (beforeOrder.codSettlementStatus === "expected") {
          updateFields.codSettlementStatus = "none";
        }
      }
      if (body.paymentStatus === "failed") updateFields.failedAt = new Date();
    }

    if (typeof body.notes === "string") {
      updateFields.notes = body.notes.trim().slice(0, 1000);
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    // Recompute expected COD cleanly if order was cancelled
    if (
      nextStatusNormalized === "cancelled" ||
      nextStatusNormalized === "refunded" ||
      nextStatusNormalized === "failed"
    ) {
      updateFields.expectedCodAmount = 0;
      if (beforeOrder.codSettlementStatus === "expected") {
        updateFields.codSettlementStatus = "none";
      }
    }

    if (nextStatusNormalized === "cancelled") {
      const shipStatus = String(beforeOrder.shipmentStatus || "not_booked").toLowerCase();
      const courierDisposition =
        shipStatus === "cancelled"
          ? "cancelled"
          : shipStatus === "return_initiated" || shipStatus === "returned"
            ? "return_requested"
            : "not_booked";

      updateFields.cancellationDetails = {
        cancelledAt: new Date(),
        cancelledBy: auth.user || "admin",
        reasonCode:
          typeof body.reasonCode === "string" && body.reasonCode.trim()
            ? body.reasonCode.trim().slice(0, 60)
            : null,
        reason:
          typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "Cancelled by admin",
        adminNote:
          typeof body.adminNote === "string" && body.adminNote.trim()
            ? body.adminNote.trim().slice(0, 500)
            : null,
        decision: body.cancelDecision === "cancel_and_refund" ? "cancel_and_refund" : "cancel_only",
        refundId: null,
        refundOutcome: null,
        courierDisposition,
      };
    }

    const now = new Date();
    const statusChanged =
      nextStatusNormalized !== null &&
      normalizeOrderStatus(beforeOrder.orderStatus) !== nextStatusNormalized;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOps: Record<string, any> = { $set: updateFields };
    if (statusChanged && nextStatusNormalized) {
      const reasonNote =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim().slice(0, 240)
          : `Status changed to ${nextStatusNormalized}`;
      updateOps.$push = {
        statusHistory: {
          status: nextStatusNormalized,
          previousStatus: beforeOrder.orderStatus,
          actor: auth.user || "admin",
          note: reasonNote,
          source: "admin",
          at: now,
        },
      };
    }

    const updated = await Order.findOneAndUpdate(query, updateOps, {
      returnDocument: "after",
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderDoc = await Order.findById(updated._id);
    if (orderDoc) {
      if (
        updated.orderStatus === "cancelled" ||
        updated.orderStatus === "refunded" ||
        updated.orderStatus === "failed"
      ) {
        // Never restore stock automatically if parcel is already picked up / in transit / delivered.
        await releaseStockForOrder(orderDoc);
      } else if (
        updated.orderStatus === "completed" ||
        updated.orderStatus === "delivered" ||
        updated.paymentStatus === "paid"
      ) {
        await commitStockForOrder(orderDoc);
      }
      // Note: "returned" status does NOT auto-restore stock; physical receipt + inspection
      // via confirmPhysicalReturn is required first.
    }

    const paymentChanged = beforeOrder.paymentStatus !== updated.paymentStatus;
    const notesChanged = beforeOrder.notes !== updated.notes;
    if (statusChanged || paymentChanged || notesChanged) {
      try {
        await AdminAuditLog.create({
          tenantId: auth.tenantId,
          actor: auth.user || "unknown",
          action: statusChanged
            ? "order.status.update"
            : paymentChanged
              ? "order.payment.status_update"
              : "order.notes.update",
          targetType: "order",
          targetId: updated.orderNumber,
          before: {
            orderStatus: beforeOrder.orderStatus,
            paymentStatus: beforeOrder.paymentStatus,
            notes: beforeOrder.notes || "",
          },
          after: {
            orderStatus: updated.orderStatus,
            paymentStatus: updated.paymentStatus,
            notes: updated.notes || "",
          },
          ip: clientIp(request),
          userAgent: request.headers.get("user-agent") || "",
        });
      } catch (auditErr) {
        console.warn("Admin audit log write failed:", auditErr);
      }
    }

    let autoBookResult: Awaited<ReturnType<typeof tryAutoBookOnConfirm>> | null = null;
    if (
      orderDoc &&
      statusChanged &&
      ["confirmed", "processing", "ready_to_ship"].includes(String(updated.orderStatus))
    ) {
      try {
        autoBookResult = await tryAutoBookOnConfirm(orderDoc);
      } catch (autoErr) {
        console.warn("Auto-book on confirm failed:", autoErr);
      }
    }

    let refundResult: {
      ok: boolean;
      refundId?: string;
      status?: string;
      error?: string;
      reconciliationRequired?: boolean;
    } | null = null;

    if (
      nextStatusNormalized === "cancelled" &&
      body.cancelDecision === "cancel_and_refund" &&
      body.refund &&
      typeof body.refund === "object"
    ) {
      const reqAmt = Math.round(Number(body.refund.amount) * 100) / 100;
      const refundReason =
        typeof body.refund.reason === "string" && body.refund.reason.trim()
          ? body.refund.reason.trim().slice(0, 240)
          : typeof body.reason === "string" && body.reason.trim()
            ? body.reason.trim().slice(0, 240)
            : `Order #${updated.orderNumber} cancelled`;
      const idempotencyKey =
        typeof body.refund.idempotencyKey === "string" && body.refund.idempotencyKey.trim()
          ? body.refund.idempotencyKey.trim()
          : `cancel-${updated.orderNumber}-${Date.now().toString(36)}`;

      try {
        const summary = await computeOrderRefundSummary(updated.orderNumber, updated._id);
        const gatewayAttempt = summary.eligibleGatewayAttempts.find(
          (a) => a.available >= reqAmt - 0.01 && a.bankTranId && a.valId
        );

        if (gatewayAttempt && body.refund.channel !== "manual_offline") {
          const gwRes = await ProcessRefundService.initiateRefund({
            attemptId: gatewayAttempt.attemptId,
            amount: reqAmt,
            reason: refundReason,
            requestedBy: auth.user || "admin",
            idempotencyKey,
          });
          refundResult = {
            ok: gwRes.ok,
            refundId: gwRes.refundId,
            status: gwRes.status,
            error: gwRes.error,
            reconciliationRequired: "reconciliationRequired" in gwRes ? gwRes.reconciliationRequired : false,
          };
        } else {
          const manRes = await ProcessRefundService.recordManualRefund({
            orderNumber: updated.orderNumber,
            orderId: updated._id,
            amount: reqAmt,
            refundMethod:
              typeof body.refund.method === "string" && body.refund.method.trim()
                ? body.refund.method.trim()
                : "manual_offline",
            externalReference:
              typeof body.refund.reference === "string" && body.refund.reference.trim()
                ? body.refund.reference.trim()
                : `CANCEL-${updated.orderNumber}`,
            refundDate: body.refund.refundDate ? new Date(body.refund.refundDate) : new Date(),
            reason: refundReason,
            requestedBy: auth.user || "admin",
            adminNote:
              typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 300) : undefined,
            idempotencyKey,
            tenantId: auth.tenantId,
            ip: clientIp(request),
            userAgent: request.headers.get("user-agent") || "",
          });
          refundResult = manRes.ok
            ? { ok: true, refundId: manRes.refundId, status: "succeeded" }
            : { ok: false, status: "failed", error: manRes.error };
        }

        if (refundResult) {
          await Order.updateOne(
            { _id: updated._id },
            {
              $set: {
                "cancellationDetails.refundId": refundResult.refundId || null,
                "cancellationDetails.refundOutcome": refundResult.status || (refundResult.ok ? "processing" : "failed"),
              },
            }
          );
        }
      } catch (refundErr) {
        const msg = refundErr instanceof Error ? refundErr.message : String(refundErr);
        refundResult = { ok: false, status: "failed", error: msg };
        await Order.updateOne(
          { _id: updated._id },
          {
            $set: {
              "cancellationDetails.refundOutcome": "failed",
            },
          }
        );
      }
    }

    const finalOrder =
      autoBookResult?.booked || refundResult
        ? (await Order.findById(updated._id).lean()) || updated
        : updated;

    return NextResponse.json(
      {
        ...finalOrder,
        id: finalOrder.orderNumber,
        status: finalOrder.orderStatus,
        paymentStatus: finalOrder.paymentStatus,
        payment_status: finalOrder.paymentStatus,
        financials: computeOrderFinancials(finalOrder),
        allowedNextStatuses: getAllowedNextStatuses(finalOrder.orderStatus),
        ...(autoBookResult?.attempted ? { autoBook: autoBookResult } : {}),
        ...(nextStatusNormalized === "cancelled" ? { orderCancelled: true } : {}),
        ...(refundResult ? { refundResult } : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof OrderCancellationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
