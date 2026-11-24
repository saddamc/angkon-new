import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
import { Payment } from "@/models/Payment";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { reserveStockForOrder, restoreReservedItems } from "@/server/products/stock";
import { clientIp } from "@/server/security/rate-limit";
import {
  computeOrderFinancials,
  evaluateReopenOrderEligibility,
  getAllowedNextStatuses,
} from "@/server/orders/workflow";

export const dynamic = "force-dynamic";

export async function POST(
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
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length < 3) {
      return NextResponse.json(
        {
          error: "A valid admin reason (minimum 3 characters) is required to reopen an order.",
          code: "ADMIN_REASON_REQUIRED",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ orderNumber: id }, { _id: id }] }
      : { orderNumber: id };

    const order = await Order.findOne(query).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 1. Query courier shipment records for active consignment check
    const shipments = await Shipment.find({ orderNumber: order.orderNumber }).lean();
    const activeShipment = shipments.find(
      (s) => !["cancelled", "returned", "failed"].includes(String(s.status))
    );

    // 2. Query payment gateway attempts for verified paid check
    const payments = await Payment.find({ orderNumber: order.orderNumber }).lean();
    const hasVerifiedPaymentTxn = payments.some(
      (p) =>
        String(p.status).toUpperCase() === "VALID" ||
        String(p.status).toUpperCase() === "VALIDATED" ||
        String(p.status).toLowerCase() === "paid"
    );
    const isRefunded =
      payments.some(
        (p) =>
          (p.refundedAmount && p.refundedAmount > 0) ||
          String(p.status).toUpperCase() === "REFUNDED"
      ) ||
      order.paymentStatus === "refunded" ||
      order.paymentStatus === "partially_refunded";

    // 3. Evaluate eligibility
    const eligibility = evaluateReopenOrderEligibility({
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      paidAmount: order.paidAmount,
      consignmentId: order.consignmentId,
      shipmentStatus: order.shipmentStatus,
      shipmentBookingState: order.shipmentBookingState,
      hasActiveShipment: Boolean(activeShipment),
      hasVerifiedPaymentTxn,
      isRefunded,
    });

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: eligibility.reason,
          code: eligibility.code,
        },
        { status: 409 }
      );
    }

    // 4. Inventory re-check and re-reservation
    const reserveResult = await reserveStockForOrder(order.items || []);
    if (!reserveResult.ok) {
      return NextResponse.json(
        {
          error: `Cannot reopen order: insufficient stock for product "${reserveResult.item?.name || 'item'}". Inventory must be available before reopening.`,
          code: "INSUFFICIENT_STOCK",
        },
        { status: 409 }
      );
    }

    // 5. Update order atomically while ensuring it's still cancelled
    const now = new Date();
    const updateFields: Record<string, unknown> = {
      orderStatus: eligibility.targetOrderStatus,
      paymentStatus: eligibility.targetPaymentStatus,
      shipmentBookingState: "not_booked",
      // Clear the order's courier summary so a cancelled consignment is not
      // mistaken for an active one. Consignment history stays in `shipments`
      // and re-booking creates a new parcel with a new Shipment record.
      shipmentStatus: "not_booked",
      consignmentId: "",
      trackingCode: "",
      trackingUrl: null,
      providerStatus: "",
      courierBookingError: null,
      courierConfirmedAt: null,
      stockReservedAt: now,
      stockReleasedAt: null,
      stockCommittedAt: null,
    };

    if (eligibility.shouldRestoreCodBalance) {
      updateFields.expectedCodAmount = order.total;
      if (order.codSettlementStatus === "none") {
        updateFields.codSettlementStatus = "expected";
      }
    }

    const historyEntry = {
      status: eligibility.targetOrderStatus,
      previousStatus: "cancelled",
      actor: auth.user || "admin",
      note: `Order Reopened: ${reason} (${eligibility.summary})`,
      source: "admin_recovery",
      at: now,
    };

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: "cancelled" },
      {
        $set: updateFields,
        $push: { statusHistory: historyEntry },
      },
      { returnDocument: "after" }
    ).lean();

    if (!updatedOrder) {
      // Roll back the stock reservation if the order was concurrently modified
      await restoreReservedItems(reserveResult.reserved);
      return NextResponse.json(
        {
          error: "Could not reopen order. Order may have been updated concurrently or is no longer cancelled.",
          code: "CONFLICT",
        },
        { status: 409 }
      );
    }

    // 6. Record immutable audit log
    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "order.reopen",
        targetType: "order",
        targetId: order.orderNumber,
        before: {
          orderStatus: "cancelled",
          paymentStatus: order.paymentStatus,
          shipmentBookingState: order.shipmentBookingState,
        },
        after: {
          orderStatus: eligibility.targetOrderStatus,
          paymentStatus: eligibility.targetPaymentStatus,
          reason,
          summary: eligibility.summary,
        },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Failed to record admin audit log on order reopen:", auditErr);
    }

    return NextResponse.json(
      {
        ok: true,
        message: `Order #${order.orderNumber} successfully reopened to ${eligibility.targetOrderStatus}.`,
        order: {
          ...updatedOrder,
          id: updatedOrder.orderNumber,
          status: updatedOrder.orderStatus,
          financials: computeOrderFinancials(updatedOrder),
          allowedNextStatuses: getAllowedNextStatuses(updatedOrder.orderStatus),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/reopen error:", error);
    return NextResponse.json({ error: "Failed to reopen order" }, { status: 500 });
  }
}
