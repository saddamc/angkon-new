import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { CourierLog } from "@/models/CourierLog";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Shipment } from "@/models/Shipment";
import { User } from "@/models/User";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { courierService } from "@/server/courier";
import { serializeShipment } from "@/server/courier/serialize";
import { getCourierSettings } from "@/server/courier/settings";
import {
  checkCourierBookingEligibility,
  computeOrderFinancials,
  evaluateReopenOrderEligibility,
  getAllowedNextStatuses,
} from "@/server/orders/workflow";

export const dynamic = "force-dynamic";

async function findOrder(id: string) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ orderNumber: id }, { _id: id }] }
    : { orderNumber: id };
  return Order.findOne(query).lean();
}

export interface TimelineEvent {
  id: string;
  at: string;
  category: "order" | "payment" | "shipment" | "note" | "audit";
  title: string;
  description: string;
  actor: string;
  action?: string;
  metadata?: Record<string, unknown> | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
}

function formatAuditTitle(action: string): string {
  switch (action) {
    case "order.status.update":
      return "Order Status Updated";
    case "order.payment.cod_fallback":
      return "Switched to Cash on Delivery (COD)";
    case "order.payment.status_update":
      return "Payment Status Updated";
    case "order.reopen":
      return "Order Reopened from Cancellation";
    case "order.notes.update":
      return "Admin Internal Note";
    case "order.manual_payment":
      return "Manual Payment Recorded";
    case "order.settlement":
      return "Courier Settlement Reconciled";
    case "order.shipment.create":
      return "Courier Consignment Booked";
    case "order.shipment.cancel":
      return "Courier Consignment Cancelled";
    default:
      return action
        .replace(/[\._]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function formatAuditDescription(action: string, after?: Record<string, unknown> | null): string {
  if (!after || typeof after !== "object" || Object.keys(after).length === 0) {
    return action.replace(/[\._]/g, " ");
  }

  if (action === "order.payment.cod_fallback") {
    const parts = ["Payment method switched to COD with customer agreement."];
    if (after.expectedCodAmount !== undefined) parts.push(`Collectible COD: ৳${Number(after.expectedCodAmount).toLocaleString()}`);
    if (after.reason) parts.push(`Reason: "${after.reason}"`);
    return parts.join(" ");
  }

  const parts: string[] = [];
  if (after.orderStatus) parts.push(`Status set to ${after.orderStatus}`);
  if (after.paymentStatus) parts.push(`Payment marked ${after.paymentStatus}`);
  if (after.shipmentStatus) parts.push(`Shipment set to ${after.shipmentStatus}`);
  if (after.consignmentId) parts.push(`Consignment ID: ${after.consignmentId}`);
  if (after.trackingCode) parts.push(`Tracking code: ${after.trackingCode}`);
  if (after.reason) parts.push(`Reason: "${after.reason}"`);
  if (after.note) parts.push(`Note: ${after.note}`);
  if (parts.length > 0) return parts.join(" · ");

  return (
    Object.entries(after)
      .filter(([, v]) => v !== undefined && v !== null && typeof v !== "object")
      .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(v)}`)
      .join(" · ") || action.replace(/[\._]/g, " ")
  );
}

/** GET — full Stage 2 Order Details (customer, items, breakdown, payments, shipments, real DB timeline). */
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
    const order = await findOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const [payments, shipments, auditLogs, courierLogs, courierSettings, accountUser] =
      await Promise.all([
        Payment.find({ orderNumber: order.orderNumber }).sort({ createdAt: -1 }).limit(25).lean(),
        Shipment.find({ orderNumber: order.orderNumber }).sort({ createdAt: -1 }).limit(20),
        AdminAuditLog.find({ targetType: "order", targetId: order.orderNumber })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        CourierLog.find({ orderNumber: order.orderNumber }).sort({ createdAt: -1 }).limit(30).lean(),
        getCourierSettings(),
        order.userId
          ? User.findById(order.userId).select("email name phone").lean()
          : Promise.resolve(null),
      ]);

    const activeShipment = shipments.find(
      (s) => !["cancelled", "returned", "failed"].includes(String(s.status))
    );
    const financials = computeOrderFinancials(order);
    const eligibility = checkCourierBookingEligibility({
      orderStatus: order.orderStatus,
      shipmentStatus: order.shipmentStatus,
      shipmentBookingState: order.shipmentBookingState,
      consignmentId: order.consignmentId,
      hasActiveShipmentRow: Boolean(activeShipment),
    });
    const allowedNextStatuses = getAllowedNextStatuses(order.orderStatus);

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

    const reopenEligibility = evaluateReopenOrderEligibility({
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

    // Build chronological real DB timeline
    const timeline: TimelineEvent[] = [];

    if (order.createdAt) {
      timeline.push({
        id: `created-${order.orderNumber}`,
        at: new Date(order.createdAt).toISOString(),
        category: "order",
        title: "Order Placed",
        description: `Order #${order.orderNumber} submitted via ${(order.paymentMethod || "cod").toUpperCase()} for ৳${order.total}.`,
        actor: order.customer?.fullName || "Customer",
      });
    }

    for (let i = 0; i < (order.statusHistory || []).length; i++) {
      const h = order.statusHistory![i];
      if (!h?.at) continue;
      const formattedStatus = (h.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const title =
        h.status === "cancelled"
          ? "Order Cancelled"
          : h.previousStatus === "cancelled"
          ? "Order Reopened"
          : `Status: ${formattedStatus}`;

      timeline.push({
        id: `status-${i}-${new Date(h.at).getTime()}`,
        at: new Date(h.at).toISOString(),
        category: "order",
        title,
        description: h.note || (h.previousStatus ? `${h.previousStatus} → ${h.status}` : h.status),
        actor: h.actor || h.source || "system",
        fromStatus: h.previousStatus || null,
        toStatus: h.status || null,
        note: h.note || null,
      });
    }

    for (const p of payments) {
      const pTime = p.paidAt || p.refundedAt || p.failedAt || p.createdAt;
      if (!pTime) continue;
      const statusTitle = String(p.status).toUpperCase();
      timeline.push({
        id: `pay-${String(p._id)}`,
        at: new Date(pTime).toISOString(),
        category: "payment",
        title: `Payment ${statusTitle} (${p.provider.toUpperCase()})`,
        description: `৳${Number(p.amount).toLocaleString()} ${p.currency || "BDT"} · TXN: ${p.tranId}${p.valId ? ` · VAL: ${p.valId}` : ""}${p.note ? ` · ${p.note}` : ""}`,
        actor: p.recordedBy || p.provider,
        action: `payment.${String(p.status).toLowerCase()}`,
        metadata: {
          provider: p.provider,
          amount: p.amount,
          currency: p.currency,
          tranId: p.tranId,
          valId: p.valId,
          cardType: p.cardType,
        },
      });
    }

    for (const s of shipments) {
      for (let i = 0; i < (s.events || []).length; i++) {
        const ev = s.events[i];
        if (!ev?.at) continue;
        const formattedEv = (ev.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        timeline.push({
          id: `ship-${String(s._id)}-${i}`,
          at: new Date(ev.at).toISOString(),
          category: "shipment",
          title: `Courier (${s.provider.toUpperCase()}): ${formattedEv}`,
          description: ev.note || (s.consignmentId ? `Consignment #${s.consignmentId}` : ""),
          actor: s.provider,
          action: `courier.${ev.status}`,
          metadata: {
            consignmentId: s.consignmentId,
            trackingCode: s.trackingCode,
            status: ev.status,
            raw: ev.raw,
          },
        });
      }
    }

    for (const n of order.adminNotes || []) {
      if (!n?.at) continue;
      timeline.push({
        id: `note-${n.id}`,
        at: new Date(n.at).toISOString(),
        category: "note",
        title: "Admin Internal Note",
        description: n.text,
        actor: n.actor || "admin",
        action: "order.note",
      });
    }

    for (const a of auditLogs) {
      if (!a?.createdAt) continue;
      const after = (a.after as Record<string, unknown> | null) || null;
      const before = (a.before as Record<string, unknown> | null) || null;
      const aTime = new Date(a.createdAt).getTime();

      // Deduplicate order.status.update if corresponding status card exists within 10s
      if (a.action === "order.status.update") {
        const match = timeline.find(
          (t) =>
            t.category === "order" &&
            Math.abs(new Date(t.at).getTime() - aTime) < 10000 &&
            (!after?.orderStatus ||
              t.toStatus === after.orderStatus ||
              t.title.toLowerCase().includes(String(after.orderStatus).toLowerCase()))
        );
        if (match) {
          match.metadata = { before, after };
          match.action = a.action;
          if (a.actor && match.actor === "system") match.actor = a.actor;
          if (!match.note && after?.reason) match.note = String(after.reason);
          continue;
        }
      }

      const isPaymentAction =
        a.action.includes("payment") ||
        a.action === "order.settlement" ||
        a.action === "order.payment.cod_fallback";

      timeline.push({
        id: `audit-${String(a._id)}`,
        at: new Date(a.createdAt).toISOString(),
        category: isPaymentAction
          ? "payment"
          : a.action.startsWith("order.shipment")
          ? "shipment"
          : "audit",
        title: formatAuditTitle(a.action),
        description: formatAuditDescription(a.action, after),
        actor: a.actor || "admin",
        action: a.action,
        metadata: { before, after },
        note: (after?.reason as string) || (after?.note as string) || null,
      });
    }

    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return NextResponse.json(
      {
        order: {
          ...order,
          id: order.orderNumber,
          number: order.orderNumber,
          status: order.orderStatus,
          customer: {
            ...order.customer,
            email: order.customer?.email || (accountUser?.email ? String(accountUser.email) : ""),
          },
          financials,
          allowedNextStatuses,
          bookingEligibility: eligibility,
          reopenEligibility,
        },
        providers: courierService.getProviderStatuses(courierSettings),
        payments: payments.map((p) => ({
          id: String(p._id),
          provider: p.provider,
          status: p.status,
          amount: p.amount,
          currency: p.currency,
          tranId: p.tranId,
          valId: p.valId || null,
          bankTranId: p.bankTranId || null,
          cardType: p.cardType || null,
          cardBrand: p.cardBrand || null,
          riskLevel: p.riskLevel || null,
          initiatedAt: p.initiatedAt,
          paidAt: p.paidAt || null,
          validatedAt: p.validatedAt || null,
          failedAt: p.failedAt || null,
          refundedAmount: p.refundedAmount || 0,
          refundRefId: p.refundRefId || null,
          refundReason: p.refundReason || null,
          refundedAt: p.refundedAt || null,
          recordedBy: p.recordedBy || null,
          note: p.note || null,
        })),
        shipments: shipments.map(serializeShipment),
        courierLogs: courierLogs.map((l) => ({
          id: String(l._id),
          provider: l.provider,
          action: l.action,
          ok: l.ok,
          httpStatus: l.httpStatus ?? null,
          errorCode: l.errorCode || null,
          message: l.message,
          actor: l.actor || "system",
          createdAt: l.createdAt,
        })),
        auditLogs: auditLogs.map((a) => ({
          id: String(a._id),
          actor: a.actor,
          action: a.action,
          before: a.before || null,
          after: a.after || null,
          ip: a.ip || "",
          createdAt: a.createdAt,
        })),
        timeline,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/orders/[id]/details error:", error);
    return NextResponse.json({ error: "Failed to load order details." }, { status: 500 });
  }
}
