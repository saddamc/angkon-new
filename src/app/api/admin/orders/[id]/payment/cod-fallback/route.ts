import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { computeOrderFinancials } from "@/server/orders/workflow";
import { clientIp } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/payment/cod-fallback
 *
 * Requirements:
 * - Allows switching an unpaid online (SSLCOMMERZ) order to Cash on Delivery ONLY after customer agreement.
 * - Requires an admin reason and confirmation.
 * - Records the payment-method change in audit history and admin notes.
 * - Recalculates COD collectible balance from outstanding balance.
 * - Never converts online orders to COD automatically.
 */
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
    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ orderNumber: id }, { _id: id }] }
      : { orderNumber: id };

    const order = await Order.findOne(query);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (["cancelled", "refunded", "failed"].includes(order.orderStatus)) {
      return NextResponse.json(
        { error: "Cannot switch payment method for a cancelled or refunded order." },
        { status: 400 }
      );
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Cannot convert a fully paid order to Cash on Delivery." },
        { status: 400 }
      );
    }

    if (order.paymentMethod === "cod") {
      return NextResponse.json(
        { error: "This order is already set to Cash on Delivery." },
        { status: 400 }
      );
    }

    if (!body.customerAgreed) {
      return NextResponse.json(
        { error: "Customer consent is required before falling back to Cash on Delivery." },
        { status: 422 }
      );
    }

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 5) {
      return NextResponse.json(
        { error: "A clear admin audit reason (min 5 characters) is required." },
        { status: 422 }
      );
    }

    const outstandingCod = Math.max(0, order.total - (order.paidAmount || 0));
    const now = new Date();

    const beforeSnapshot = {
      paymentMethod: order.paymentMethod,
      expectedCodAmount: order.expectedCodAmount,
      codSettlementStatus: order.codSettlementStatus,
    };

    order.paymentMethod = "cod";
    order.expectedCodAmount = outstandingCod;
    order.codSettlementStatus = outstandingCod > 0 ? "expected" : "none";

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.orderStatus,
      previousStatus: order.orderStatus,
      actor: auth.user || "admin",
      note: `Switched payment method from ${beforeSnapshot.paymentMethod} to COD upon customer agreement: "${reason}"`,
      source: "admin_cod_fallback",
      at: now,
    });

    if (!order.adminNotes) order.adminNotes = [];
    order.adminNotes.push({
      id: crypto.randomUUID(),
      text: `[COD Fallback] Payment method changed to Cash on Delivery with customer agreement. Reason: ${reason}. Collectible COD: ৳${outstandingCod.toLocaleString("en-BD")}.`,
      actor: auth.user || "admin",
      at: now,
    });

    await order.save();

    await AdminAuditLog.create({
      tenantId: auth.tenantId || "angkon-main",
      actor: auth.user || "admin",
      action: "order.payment.cod_fallback",
      targetType: "order",
      targetId: order.orderNumber,
      before: beforeSnapshot,
      after: {
        paymentMethod: "cod",
        expectedCodAmount: outstandingCod,
        codSettlementStatus: order.codSettlementStatus,
        reason,
        customerAgreed: true,
      },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const updatedFinancials = computeOrderFinancials(order);

    return NextResponse.json({
      ok: true,
      order: {
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        expectedCodAmount: order.expectedCodAmount,
        codSettlementStatus: order.codSettlementStatus,
        financials: updatedFinancials,
      },
      message: `Order #${order.orderNumber} successfully switched to COD (Collectible: ৳${outstandingCod.toLocaleString("en-BD")}).`,
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/payment/cod-fallback error:", error);
    return NextResponse.json(
      { error: "Could not apply COD fallback." },
      { status: 500 }
    );
  }
}
