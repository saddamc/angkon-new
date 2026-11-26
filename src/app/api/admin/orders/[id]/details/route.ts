import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { CourierLog } from "@/models/CourierLog";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { PaymentRefund } from "@/models/PaymentRefund";
import { PaymentEvent } from "@/models/PaymentEvent";
import { Shipment } from "@/models/Shipment";
import { User } from "@/models/User";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { courierService } from "@/server/courier";
import { serializeShipment } from "@/server/courier/core/serialize";
import { getCourierSettings } from "@/server/courier/settings";
import {
  checkCourierBookingEligibility,
  computeOrderFinancials,
  evaluateReopenOrderEligibility,
  getAllowedNextStatuses,
} from "@/server/orders/workflow";
import { resolveLiveProductImageMap } from "@/server/orders/services/order-query.service";
import { computeOrderRefundSummary } from "@/server/payments/services/order-refund-summary.service";

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
    case "order.payment.manual_refund":
      return "Manual Offline Refund Recorded";
    case "order.settlement":
      return "Courier Settlement Reconciled";
    case "order.shipment.create":
      return "Courier Consignment Booked";
    case "order.shipment.cancel":
    case "order.shipment.cancelled":
      return "Courier Consignment Cancelled";
    case "order.shipment.return_requested":
      return "Courier Return / Recall Requested";
    case "order.shipment.physical_return_confirmed":
      return "Physical Return Receipt & Inspection Confirmed";
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

    const [
      payments,
      shipments,
      auditLogs,
      courierLogs,
      courierSettings,
      accountUser,
      paymentRefunds,
      paymentEvents,
      refundSummary,
    ] = await Promise.all([
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
      PaymentRefund.find({ orderNumber: order.orderNumber }).sort({ createdAt: -1 }).lean(),
      PaymentEvent.find({
        orderNumber: order.orderNumber,
        eventType: {
          $in: [
            "refund_initiated",
            "refund_completed",
            "refund_failed",
            "manual_refund_recorded",
            "refund_timeout_reconcile_needed",
            "courier_return_requested",
            "physical_return_confirmed",
            "stock_released",
          ],
        },
      })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean(),
      computeOrderRefundSummary(order.orderNumber, order._id),
    ]);

    const activeShipment = shipments.find(
      (s) => !["cancelled", "returned", "failed"].includes(String(s.status))
    );
    const financials = computeOrderFinancials(order);
    const eligibility = checkCourierBookingEligibility({
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paidAmount: order.paidAmount,
      total: order.total,
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

    // ── Build Chronological De-duplicated Timeline ─────────────────────────────
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

    for (const r of paymentRefunds) {
      const rTime = r.processedAt || r.failedAt || r.initiatedAt || r.createdAt;
      if (!rTime) continue;
      const channelLabel = r.refundChannel === "manual_offline" ? "Manual Offline" : "SSLCOMMERZ";
      const statusLabel = String(r.status).toUpperCase();
      timeline.push({
        id: `refund-${r.refundId}`,
        at: new Date(rTime).toISOString(),
        category: "payment",
        title: `Refund ${statusLabel} (${channelLabel})`,
        description: `৳${Number(r.amount).toLocaleString()} ${r.currency || "BDT"} · ID: ${r.refundId}${r.refundRefId ? ` · Ref: ${r.refundRefId}` : ""}${r.externalReference ? ` · Ext Ref: ${r.externalReference}` : ""}${r.reason ? ` · ${r.reason}` : ""}`,
        actor: r.requestedBy || "admin",
        action: `refund.${String(r.status).toLowerCase()}`,
        metadata: {
          refundId: r.refundId,
          refundChannel: r.refundChannel || "sslcommerz",
          status: r.status,
          amount: r.amount,
          refundRefId: r.refundRefId || null,
          externalReference: r.externalReference || null,
          reconciliationRequired: Boolean(r.reconciliationRequired),
        },
      });
    }

    for (const ev of paymentEvents) {
      const evTime = ev.timestamp || ev.createdAt;
      if (!evTime) continue;
      const meta = (ev.metadata || {}) as Record<string, unknown>;
      const refundId = typeof meta.refundId === "string" ? meta.refundId : undefined;
      timeline.push({
        id: `pevent-${String(ev._id)}`,
        at: new Date(evTime).toISOString(),
        category: "payment",
        title: String(ev.eventType)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        description: refundId
          ? `Refund ${refundId}${meta.amount ? ` · ৳${Number(meta.amount).toLocaleString()}` : ""}${meta.error ? ` · ${String(meta.error)}` : ""}`
          : `Event ${ev.eventType}`,
        actor: String(ev.source || "system"),
        action: `payment_event.${ev.eventType}`,
        metadata: { ...meta, refundId },
      });
    }

    // Process shipments: group booking steps, label mock consignments, suppress duplicate consecutive polls
    for (const s of shipments) {
      const isMock = Boolean(
        s.isMock ||
        s.mode === "mock" ||
        s.consignmentId?.startsWith("MOCK-") ||
        s.trackingCode?.startsWith("MOCK-")
      );
      const provUpper = s.provider.toUpperCase();
      const mockPrefix = isMock ? "[SIMULATED / TEST] " : "";

      let lastStatus: string | null = null;
      const rawEvents = s.events || [];

      // If initial events are (0: pending request) and (1: created confirmation within 15s), group them
      let startIdx = 0;
      if (
        rawEvents.length >= 2 &&
        rawEvents[0]?.status === "pending" &&
        rawEvents[1]?.status === "created" &&
        Math.abs(new Date(rawEvents[1].at).getTime() - new Date(rawEvents[0].at).getTime()) < 15000
      ) {
        // Single unified booking confirmation event
        const ev = rawEvents[1];
        const note = isMock
          ? `[SIMULATED] Mock consignment generated for development testing. CID: ${s.consignmentId || "—"}`
          : `Consignment booked with ${s.provider}. CID: ${s.consignmentId || "—"}`;

        timeline.push({
          id: `ship-${String(s._id)}-booking-group`,
          at: new Date(ev.at).toISOString(),
          category: "shipment",
          title: `${mockPrefix}Shipment Booked (${provUpper})`,
          description: note,
          actor: s.provider,
          action: "courier.booked",
          metadata: {
            consignmentId: s.consignmentId,
            trackingCode: s.trackingCode,
            isMock,
            status: "booked",
            bookingRequestedAt: rawEvents[0].at,
            bookingConfirmedAt: ev.at,
          },
        });
        lastStatus = "booked";
        startIdx = 2; // skip the raw request & response pair
      }

      for (let i = startIdx; i < rawEvents.length; i++) {
        const ev = rawEvents[i];
        if (!ev?.at) continue;

        const effectiveStatus = (ev.status || "").toLowerCase();
        // Suppress repeated status polls reporting identical status
        if (lastStatus && (lastStatus === effectiveStatus || (lastStatus === "booked" && effectiveStatus === "created"))) {
          continue;
        }
        lastStatus = effectiveStatus;

        let note = ev.note || "";
        if (isMock && note.toLowerCase().includes("accepted by steadfast")) {
          note = "[SIMULATED] Mock consignment simulated in development.";
        }

        const formattedEv = (ev.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        timeline.push({
          id: `ship-${String(s._id)}-${i}`,
          at: new Date(ev.at).toISOString(),
          category: "shipment",
          title: `${mockPrefix}Courier (${provUpper}): ${formattedEv}`,
          description: note || (s.consignmentId ? `Consignment #${s.consignmentId}` : ""),
          actor: s.provider,
          action: `courier.${ev.status}`,
          metadata: {
            consignmentId: s.consignmentId,
            trackingCode: s.trackingCode,
            status: ev.status,
            isMock,
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

      // If an audit event represents shipment booking, merge audit actor/diff with existing shipment event
      if (a.action === "order.shipment.create" || a.action === "order.shipment.booked") {
        const shipMatch = timeline.find(
          (t) =>
            t.category === "shipment" &&
            Math.abs(new Date(t.at).getTime() - aTime) < 15000
        );
        if (shipMatch) {
          shipMatch.metadata = { ...shipMatch.metadata, before, after };
          if (a.actor) shipMatch.actor = a.actor;
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

    // ── Final pass: collapse booking handshakes and repair mislabeled statuses ──
    const timeOf = (iso: string) => new Date(iso).getTime();

    // The booking status change already tells the whole story; absorb the
    // courier pending/created handshake and the matching audit entry into it.
    const bookingStatusEvent = timeline.find(
      (t) =>
        t.category === "order" &&
        t.toStatus === "ready_to_ship" &&
        /consignment/i.test(t.description || "")
    );
    const removeIds = new Set<string>();

    if (bookingStatusEvent) {
      const bookingTime = timeOf(bookingStatusEvent.at);
      for (const t of timeline) {
        if (t.id === bookingStatusEvent.id) continue;
        const delta = Math.abs(timeOf(t.at) - bookingTime);
        if (delta > 5 * 60 * 1000) continue;

        const isHandshake =
          t.category === "shipment" &&
          ["courier.pending", "courier.created", "courier.booked"].includes(String(t.action));
        const isBookingAudit =
          t.action === "order.shipment.booked" || t.action === "order.shipment.create";

        if (isHandshake || isBookingAudit) {
          const meta = (t.metadata || {}) as Record<string, unknown>;
          bookingStatusEvent.metadata = {
            ...(bookingStatusEvent.metadata || {}),
            ...(meta.consignmentId ? { consignmentId: meta.consignmentId } : {}),
            ...(meta.trackingCode ? { trackingCode: meta.trackingCode } : {}),
            ...(isBookingAudit ? { before: meta.before, after: meta.after } : {}),
          };
          if (isBookingAudit) bookingStatusEvent.action = t.action;
          removeIds.add(t.id);
        }
      }
    }

    // Some courier syncs store the new raw status in the note while the event
    // status keeps the previous value. Prefer the note's status for display.
    for (const t of timeline) {
      if (t.category !== "shipment") continue;
      const match = String(t.description || "").match(/^([a-z_]+)\s*\(/i);
      if (!match) continue;
      const raw = match[1].toLowerCase();
      if (!/^courier\./.test(String(t.action || ""))) continue;
      if (String(t.action).replace("courier.", "") === raw) continue;
      const prefix = t.title.includes(":") ? t.title.split(":")[0] : "Courier";
      const formatted = raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      t.title = `${prefix}: ${formatted}`;
      t.action = `courier.${raw}`;
    }

    // Drop exact repeats produced by multiple sources within the same minute.
    const seen = new Set<string>();
    for (const t of timeline) {
      if (removeIds.has(t.id)) continue;
      const key = `${t.category}|${t.title}|${Math.floor(new Date(t.at).getTime() / 60000)}`;
      if (seen.has(key)) {
        removeIds.add(t.id);
      } else {
        seen.add(key);
      }
    }

    const dedupedTimeline = timeline.filter((t) => !removeIds.has(t.id));
    timeline.length = 0;
    timeline.push(...dedupedTimeline);

    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const liveProductImageMap = await resolveLiveProductImageMap(
      (order.items || []).map((it) => Number(it.productId))
    );

    return NextResponse.json(
      {
        order: {
          ...order,
          items: (order.items || []).map((it) => ({
            ...it,
            image:
              (it.productId ? liveProductImageMap.get(Number(it.productId)) : undefined) ||
              it.image,
          })),
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
          cancellationDetails: order.cancellationDetails || null,
          returnInspection: order.returnInspection || null,
        },
        refundSummary,
        refunds: paymentRefunds.map((r) => ({
          id: String(r._id),
          refundId: r.refundId,
          refundChannel: r.refundChannel || "sslcommerz",
          status: r.status,
          amount: r.amount,
          currency: r.currency || "BDT",
          reason: r.reason,
          refundMethod: r.refundMethod || null,
          externalReference: r.externalReference || null,
          refundRefId: r.refundRefId || null,
          refundDate: r.refundDate || null,
          adminNote: r.adminNote || null,
          requestedBy: r.requestedBy,
          initiatedAt: r.initiatedAt,
          processedAt: r.processedAt || null,
          failedAt: r.failedAt || null,
          failureReason: r.failureReason || null,
          reconciliationRequired: Boolean(r.reconciliationRequired),
        })),
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
