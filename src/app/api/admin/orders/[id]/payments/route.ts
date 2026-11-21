import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { requireAdminSessionCore } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders/[id]/payments
 *
 * Admin payment timeline. Returns provider evidence without ever exposing
 * gateway session URLs, session-key hashes or raw provider payloads.
 */
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

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ orderNumber: id }, { _id: id }] }
      : { orderNumber: id };

    const order = await Order.findOne(query)
      .select("orderNumber paymentMethod paymentStatus orderStatus total paidAt failedAt idempotencyKey")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const payments = await Payment.find({ orderNumber: order.orderNumber })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    return NextResponse.json(
      {
        order: {
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          total: order.total,
          paidAt: order.paidAt || null,
          failedAt: order.failedAt || null,
        },
        payments: payments.map((payment) => ({
          id: String(payment._id),
          provider: payment.provider,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          tranId: payment.tranId,
          valId: payment.valId || null,
          bankTranId: payment.bankTranId || null,
          cardType: payment.cardType || null,
          cardBrand: payment.cardBrand || null,
          initiatedAt: payment.initiatedAt || null,
          paidAt: payment.paidAt || null,
          failedAt: payment.failedAt || null,
          lastReconciledAt: payment.lastReconciledAt || null,
          reconcileAttempts: payment.reconcileAttempts || 0,
          reconcileNote: payment.reconcileNote || null,
          createdAt: payment.createdAt || null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/orders/[id]/payments error:", error);
    return NextResponse.json(
      { error: "Payment history is temporarily unavailable." },
      { status: 503 }
    );
  }
}
