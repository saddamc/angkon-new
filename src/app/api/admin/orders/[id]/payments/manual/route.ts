import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { computeOrderFinancials } from "@/server/orders/workflow";
import { commitStockForOrder } from "@/server/products/stock";
import { clientIp } from "@/server/security/rate-limit";
import { ProcessRefundService } from "@/server/payments/services/process-refund";

/**
 * POST /api/admin/orders/[id]/payments/manual
 *
 * Stage 5 & Rules 5, 6, 11, 12:
 * Allows authorized admins to record verified advance/partial payments (e.g. bKash/Nagad/Cash advance)
 * or issue refund records, automatically recalculating expected COD without altering SSLCOMMERZ logs.
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

    const action = body.action === "refund" ? "refund" : "advance";
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
    }

    const now = new Date();
    const prevFinancials = computeOrderFinancials(order);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 240) : "";
    const reference =
      typeof body.reference === "string" ? body.reference.trim().slice(0, 80) : "";

    if (action === "refund") {
      const refundMethod =
        typeof body.refundMethod === "string" && body.refundMethod.trim()
          ? body.refundMethod.trim().slice(0, 60)
          : typeof body.method === "string" && body.method.trim()
            ? body.method.trim().slice(0, 60)
            : "manual_offline";
      const externalReference =
        typeof body.externalReference === "string" && body.externalReference.trim()
          ? body.externalReference.trim().slice(0, 120)
          : reference;
      if (!externalReference) {
        return NextResponse.json(
          { error: "Transaction / reference ID is required for manual refunds." },
          { status: 400 }
        );
      }
      const refundDate = body.refundDate ? new Date(body.refundDate) : now;
      const reason =
        (typeof body.reason === "string" && body.reason.trim()) ||
        note ||
        "Manual offline refund recorded by admin";
      const evidenceNote =
        typeof body.evidenceNote === "string" ? body.evidenceNote.trim().slice(0, 300) : undefined;
      const adminNote =
        typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 300) : undefined;
      const idempotencyKey =
        typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
          ? body.idempotencyKey.trim()
          : undefined;

      const result = await ProcessRefundService.recordManualRefund({
        orderNumber: order.orderNumber,
        orderId: order._id,
        amount: Math.round(amount * 100) / 100,
        refundMethod,
        externalReference,
        refundDate: Number.isNaN(refundDate.getTime()) ? now : refundDate,
        reason,
        requestedBy: auth.user || "admin",
        adminNote,
        evidenceNote,
        idempotencyKey,
        tenantId: auth.tenantId,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });

      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error, code: result.code },
          { status: result.code === "REFUND_AMOUNT_EXCEEDED" ? 409 : 400 }
        );
      }

      const updated = await Order.findById(order._id).lean();
      return NextResponse.json({
        ok: true,
        refundId: result.refundId,
        financials: updated ? computeOrderFinancials(updated) : null,
      });
    }

    // Record advance / partial / full offline payment (Rules 4, 5, 6)
    const nextPaidAmount = Math.min(
      order.total,
      Math.round((prevFinancials.advancePaidAmount + amount) * 100) / 100
    );
    const nextPaymentStatus = nextPaidAmount >= order.total ? "paid" : "partially_paid";
    const nextFinancials = computeOrderFinancials({
      ...order.toObject(),
      paidAmount: nextPaidAmount,
      paymentStatus: nextPaymentStatus,
    });

    const methodTag =
      typeof body.method === "string" && body.method.trim()
        ? body.method.trim().slice(0, 32)
        : "manual";

    const paymentDoc = await Payment.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      provider: "manual",
      status: "paid",
      amount: Math.round(amount * 100) / 100,
      expectedAmount: Math.round(amount * 100) / 100,
      currency: "BDT",
      tranId: `MAN-${order.orderNumber}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      bankTranId: reference || null,
      cardType: methodTag.toUpperCase(),
      paidAt: now,
      validatedAt: now,
      recordedBy: auth.user || "admin",
      note: note || `Advance/manual payment via ${methodTag}`,
    });

    const updated = await Order.findOneAndUpdate(
      { _id: order._id },
      {
        $set: {
          paymentStatus: nextPaymentStatus,
          paidAmount: nextPaidAmount,
          expectedCodAmount: nextFinancials.codAmountToCollect,
          ...(nextPaymentStatus === "paid"
            ? { paidAt: order.paidAt || now, codSettlementStatus: "none" }
            : {}),
        },
      },
      { returnDocument: "after" }
    ).lean();

    if (nextPaymentStatus === "paid") {
      await commitStockForOrder(order);
    }

    await AdminAuditLog.create({
      tenantId: auth.tenantId,
      actor: auth.user || "admin",
      action: "order.payment.manual_advance",
      targetType: "order",
      targetId: order.orderNumber,
      before: {
        paymentStatus: order.paymentStatus,
        paidAmount: prevFinancials.advancePaidAmount,
        expectedCodAmount: prevFinancials.expectedCodAmount,
      },
      after: {
        paymentStatus: nextPaymentStatus,
        paidAmount: nextPaidAmount,
        expectedCodAmount: nextFinancials.codAmountToCollect,
        method: methodTag,
        reference,
      },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") || "",
    }).catch((e) => console.warn("Audit log failed:", e));

    return NextResponse.json({
      ok: true,
      paymentId: String(paymentDoc._id),
      paymentStatus: nextPaymentStatus,
      financials: updated ? computeOrderFinancials(updated) : nextFinancials,
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/payments/manual error:", error);
    return NextResponse.json({ error: "Could not record payment entry." }, { status: 500 });
  }
}
