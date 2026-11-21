import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { commitStockForOrder, releaseStockForOrder } from "@/server/stock";
import { clientIp } from "@/server/rate-limit";
import { tryAutoBookOnConfirm } from "@/server/courier/auto-book";
import {
  canTransitionOrderStatus,
  computeOrderFinancials,
  getAllowedNextStatuses,
  normalizeOrderStatus,
} from "@/server/orders/workflow";

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

      // Check active shipment conditions on cancellation
      if (nextStatusNormalized === "cancelled") {
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
        beforeOrder.paymentMethod === "sslcommerz" &&
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
        updated.orderStatus === "returned"
      ) {
        await releaseStockForOrder(orderDoc);
      } else if (
        updated.orderStatus === "completed" ||
        updated.orderStatus === "delivered" ||
        updated.paymentStatus === "paid"
      ) {
        await commitStockForOrder(orderDoc);
      }
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

    const finalOrder =
      autoBookResult?.booked ? (await Order.findById(updated._id).lean()) || updated : updated;

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
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
