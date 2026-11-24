import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { Order } from "@/models/Order";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { computeOrderFinancials } from "@/server/orders/workflow";
import { clientIp } from "@/server/security/rate-limit";

function sanitizeNonNegativeMoney(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
}

/**
 * POST /api/admin/orders/[id]/settlement
 *
 * Stage 5 & Rule 10/11/12: Records courier COD collection & remittance settlement
 * independently from customer payment status and delivery status.
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

    const prevFinancials = computeOrderFinancials(order);
    const collectedCodAmount = sanitizeNonNegativeMoney(
      body.collectedCodAmount,
      prevFinancials.collectedCodAmount || prevFinancials.expectedCodAmount
    );
    const settledCodAmount = sanitizeNonNegativeMoney(
      body.settledCodAmount,
      prevFinancials.settledCodAmount
    );
    const courierCharge = sanitizeNonNegativeMoney(
      body.courierCharge,
      prevFinancials.courierCharge
    );
    const settlementNote =
      typeof body.settlementNote === "string"
        ? body.settlementNote.trim().slice(0, 300)
        : order.settlementNote || "";

    const actionType = body.markSettled === false ? "collected" : "reconcile";
    let codSettlementStatus: "none" | "expected" | "collected" | "settled" | "discrepancy" =
      "collected";

    const basis = collectedCodAmount > 0 ? collectedCodAmount : prevFinancials.expectedCodAmount;
    const netExpected = Math.max(0, basis - courierCharge);
    const discrepancy = Math.round((netExpected - settledCodAmount) * 100) / 100;

    if (actionType === "reconcile") {
      codSettlementStatus = Math.abs(discrepancy) > 0.01 ? "discrepancy" : "settled";
    } else if (collectedCodAmount === 0 && prevFinancials.expectedCodAmount === 0) {
      codSettlementStatus = "none";
    }

    const now = new Date();
    const updated = await Order.findOneAndUpdate(
      { _id: order._id },
      {
        $set: {
          collectedCodAmount,
          settledCodAmount,
          courierCharge,
          settlementNote,
          codSettlementStatus,
          ...(codSettlementStatus === "settled" || codSettlementStatus === "discrepancy"
            ? { settledAt: now }
            : {}),
        },
      },
      { returnDocument: "after" }
    ).lean();

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "order.cod.settlement_reconcile",
        targetType: "order",
        targetId: order.orderNumber,
        before: {
          collectedCodAmount: prevFinancials.collectedCodAmount,
          settledCodAmount: prevFinancials.settledCodAmount,
          courierCharge: prevFinancials.courierCharge,
          codSettlementStatus: prevFinancials.codSettlementStatus,
        },
        after: {
          collectedCodAmount,
          settledCodAmount,
          courierCharge,
          discrepancyAmount: discrepancy,
          codSettlementStatus,
          settlementNote,
        },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json({
      ok: true,
      financials: updated ? computeOrderFinancials(updated) : null,
      codSettlementStatus,
      discrepancyAmount: discrepancy,
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/settlement error:", error);
    return NextResponse.json({ error: "Could not update COD settlement." }, { status: 500 });
  }
}
