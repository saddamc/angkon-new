import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Shipment } from "@/models/Shipment";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { courierService, getCourierModeConfig } from "@/server/courier";
import { isLocalTestOrder } from "@/server/courier/courier-mode";
import { serializeShipment } from "@/server/courier/serialize";
import { getCourierSettings } from "@/server/courier/settings";
import {
  calculateOrderParcelWeight,
  PACKAGING_PRESETS,
} from "@/server/courier/parcel-classifier";
import {
  checkCourierBookingEligibility,
  computeOrderFinancials,
} from "@/server/orders/workflow";
import { clientIp } from "@/server/rate-limit";
import type { CourierProviderMeta } from "@/server/courier/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function findOrder(id: string) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ orderNumber: id }, { _id: id }] }
    : { orderNumber: id };
  return Order.findOne(query);
}

/** GET — consignments, provider statuses, financials, and booking eligibility for an order. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const order = await findOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const [shipments, courierSettings] = await Promise.all([
      Shipment.find({ orderNumber: order.orderNumber }).sort({ createdAt: -1 }).limit(20),
      getCourierSettings(),
    ]);

    const providers = courierService.getProviderStatuses(courierSettings);
    const anyConfigured = providers.some((p) => p.enabled && p.configured);
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

    const productIds = (order.items || [])
      .map((it: { productId: number }) => it.productId)
      .filter((pid: unknown) => typeof pid === "number" && pid > 0);

    const products =
      productIds.length > 0
        ? await Product.find({ id: { $in: productIds } })
            .select("id name weight weightUnit shippingCategory categories")
            .lean()
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const itemsForWeight = (order.items || []).map(
      (it: { productId: number; name: string; quantity: number }) => {
        const prod = productMap.get(it.productId);
        return {
          productId: it.productId,
          name: it.name || prod?.name || `Product #${it.productId}`,
          quantity: it.quantity || 1,
          weight: prod?.weight ?? null,
          weightUnit: prod?.weightUnit ?? "kg",
          shippingCategory: prod?.shippingCategory ?? null,
          categories: prod?.categories || [],
        };
      }
    );

    const weightSummary = calculateOrderParcelWeight(itemsForWeight, "poly_mailer");

    const courierModeConfig = getCourierModeConfig();

    const isTest = Boolean(order.isTestOrder || isLocalTestOrder(order.orderNumber, order.customer, order));

    return NextResponse.json(
      {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        isTestOrder: isTest,
        configured: anyConfigured,
        courierOperatingMode: courierModeConfig.mode,
        isMockMode: courierModeConfig.isMock,
        liveBookingEnabled: courierModeConfig.liveBookingEnabled,
        defaultProvider: courierSettings.defaultProvider,
        providers,
        financials,
        eligibility,
        shipmentBookingState: order.shipmentBookingState || "not_booked",
        orderCourier: {
          courier: order.courier || "",
          courierMode: order.courierMode || (order.courier === "steadfast" ? "steadfast" : "manual"),
          courierName: order.courierName || order.courier || "",
          trackingCode: order.trackingCode || "",
          consignmentId: order.consignmentId || "",
          shipmentStatus: order.shipmentStatus || "not_booked",
          providerStatus: order.providerStatus || "",
          trackingUrl: order.trackingUrl || "",
          courierBookingError: order.courierBookingError || null,
          manualDeliveryDetails: order.manualDeliveryDetails || null,
        },
        shipments: shipments.map(serializeShipment),
        weightSummary,
        packagingPresets: PACKAGING_PRESETS,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/orders/[id]/shipment error:", error);
    return NextResponse.json({ error: "Shipment history is unavailable." }, { status: 503 });
  }
}

/** POST — create one consignment via CourierService (enforces Rules 1-12 on backend). */
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

    const rawMeta =
      body.providerMeta && typeof body.providerMeta === "object"
        ? (body.providerMeta as Record<string, unknown>)
        : {};
    const providerMeta: CourierProviderMeta = {
      ...(Number(rawMeta.cityId) > 0 ? { cityId: Number(rawMeta.cityId) } : {}),
      ...(Number(rawMeta.zoneId) > 0 ? { zoneId: Number(rawMeta.zoneId) } : {}),
      ...(Number(rawMeta.areaId) > 0 ? { areaId: Number(rawMeta.areaId) } : {}),
      ...(typeof rawMeta.areaName === "string" && rawMeta.areaName.trim()
        ? { areaName: rawMeta.areaName.trim().slice(0, 100) }
        : {}),
      ...(Number(rawMeta.deliveryType) > 0 ? { deliveryType: Number(rawMeta.deliveryType) } : {}),
      ...(Number(rawMeta.itemWeight) > 0 ? { itemWeight: Number(rawMeta.itemWeight) } : {}),
      ...(typeof rawMeta.parcelType === "string" && rawMeta.parcelType.trim()
        ? { parcelType: rawMeta.parcelType.trim().slice(0, 100) }
        : {}),
      ...(Number(rawMeta.packageWeight) > 0
        ? { packageWeight: Number(rawMeta.packageWeight) }
        : {}),
      ...(typeof rawMeta.packagingType === "string" && rawMeta.packagingType.trim()
        ? { packagingType: rawMeta.packagingType.trim().slice(0, 50) }
        : {}),
      ...(rawMeta.weightEstimated === true ? { weightEstimated: true } : {}),
      ...(typeof rawMeta.manualEstimateReason === "string" && rawMeta.manualEstimateReason.trim()
        ? { manualEstimateReason: rawMeta.manualEstimateReason.trim().slice(0, 200) }
        : {}),
      ...(typeof rawMeta.itemDescription === "string" && rawMeta.itemDescription.trim()
        ? { itemDescription: rawMeta.itemDescription.trim().slice(0, 250) }
        : {}),
      ...(Number(rawMeta.totalLot) > 0 ? { totalLot: Math.round(Number(rawMeta.totalLot)) } : {}),
    };

    const result = await courierService.bookShipment({
      orderIdOrNumber: id,
      provider: typeof body.provider === "string" ? body.provider : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
      confirmLiveBooking: body.confirmLiveBooking === true,
      recipient:
        body.recipient && typeof body.recipient === "object"
          ? (body.recipient as Record<string, unknown>)
          : undefined,
      allowCodFallback: body.allowCodFallback === true,
      providerMeta,
      actor: auth.user || "admin",
      tenantId: auth.tenantId,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") || "",
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      existing: result.existing ?? false,
      shipment: result.shipment,
      customer: result.customer,
      orderStatus: result.orderStatus,
      codAmount: result.codAmount,
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/shipment error:", error);
    return NextResponse.json(
      { error: "Could not create the courier consignment." },
      { status: 500 }
    );
  }
}

/** DELETE — cancel an active shipment consignment with full audit trail. */
export async function DELETE(
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

    const result = await courierService.cancelShipment({
      orderIdOrNumber: id,
      shipmentId: typeof body.shipmentId === "string" ? body.shipmentId : undefined,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      actor: auth.user || "admin",
      tenantId: auth.tenantId,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") || "",
      confirmExternalCancellation: body.confirmExternalCancellation === true,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE /api/admin/orders/[id]/shipment error:", error);
    return NextResponse.json(
      { error: "Could not cancel courier consignment." },
      { status: 500 }
    );
  }
}

/** PATCH — save manual courier milestones, tracking, or switch to manual delivery with audit trail. */
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
    const courier = typeof body.courier === "string" ? body.courier.trim().slice(0, 80) : "";
    const courierName =
      typeof body.courierName === "string" && body.courierName.trim()
        ? body.courierName.trim().slice(0, 100)
        : courier;
    const trackingCode =
      typeof body.trackingCode === "string" ? body.trackingCode.trim().slice(0, 120) : "";
    const status =
      typeof body.status === "string" ? body.status.trim().toLowerCase().slice(0, 40) : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 300) : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

    if (!courier && !courierName) {
      return NextResponse.json({ error: "Please select or provide a courier / rider name." }, { status: 400 });
    }

    await connectToDatabase();
    const order = await findOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Phase 5 Gate: If switching from an existing Steadfast consignment,
    // require that the consignment is cancelled first.
    const hasActiveSteadfast =
      order.courier === "steadfast" &&
      Boolean(order.consignmentId || order.trackingCode) &&
      !["cancelled", "booking_failed"].includes(order.shipmentBookingState || "") &&
      !["cancelled", "failed", "booking_failed"].includes(order.shipmentStatus || "");

    if (hasActiveSteadfast && body.courierMode === "manual" && !body.forceOverride) {
      return NextResponse.json(
        {
          error:
            "An active Steadfast consignment exists for this order. You must cancel the Steadfast consignment before switching to manual delivery.",
          code: "ACTIVE_CONSIGNMENT_EXISTS",
        },
        { status: 409 }
      );
    }

    const prevStatus = String(order.orderStatus);
    let nextOrderStatus = prevStatus;
    const prevShipmentStatus = String(order.shipmentStatus || "not_booked");
    const nextShipmentStatus = status || (trackingCode ? "booked" : prevShipmentStatus);

    if (["picked_up", "in_transit", "out_for_delivery"].includes(nextShipmentStatus)) {
      if (["pending", "confirmed", "processing", "ready_to_ship"].includes(prevStatus)) {
        nextOrderStatus = "shipped";
      }
    } else if (nextShipmentStatus === "delivered") {
      if (["pending", "confirmed", "processing", "ready_to_ship", "shipped"].includes(prevStatus)) {
        nextOrderStatus = "delivered";
      }
    } else if (nextShipmentStatus === "returned") {
      nextOrderStatus = "returned";
    }

    const beforeSnapshot = {
      courier: order.courier || "",
      courierMode: order.courierMode || "steadfast",
      trackingCode: order.trackingCode || "",
      shipmentStatus: order.shipmentStatus || "not_booked",
      orderStatus: order.orderStatus,
    };

    const now = new Date();
    const pickupDate = body.pickupDate ? new Date(body.pickupDate) : null;
    const shipmentDate = body.shipmentDate ? new Date(body.shipmentDate) : null;
    const deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null;

    const manualDetails = {
      courierName: courierName || courier,
      trackingNumber: trackingCode,
      pickupDate,
      shipmentDate,
      deliveryDate,
      notes,
      updatedBy: auth.user || "admin",
      updatedAt: now,
    };

    const orderPatch: Record<string, unknown> = {
      courier: courier || courierName,
      courierName: courierName || courier,
      courierMode: "manual",
      trackingCode,
      shipmentStatus: nextShipmentStatus,
      shipmentBookingState: "booked",
      orderStatus: nextOrderStatus,
      manualDeliveryDetails: manualDetails,
    };

    if (nextShipmentStatus === "delivered" && order.expectedCodAmount && order.expectedCodAmount > 0) {
      orderPatch.collectedCodAmount = order.expectedCodAmount;
      if (order.codSettlementStatus !== "settled" && order.codSettlementStatus !== "discrepancy") {
        orderPatch.codSettlementStatus = "collected";
      }
    }

    const updateOps: Record<string, unknown> = {
      $set: orderPatch,
    };

    if (nextOrderStatus !== prevStatus) {
      updateOps.$push = {
        statusHistory: {
          status: nextOrderStatus,
          previousStatus: prevStatus,
          actor: auth.user || "admin",
          note: `Manual delivery milestone: ${courierName} [${nextShipmentStatus}]${notes ? ` · Note: ${notes}` : ""}`,
          source: "admin",
          at: now,
        },
      };
    }

    await Order.updateOne({ _id: order._id }, updateOps);

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "unknown",
        action: "order.delivery.manual_update",
        targetType: "order",
        targetId: order.orderNumber,
        before: beforeSnapshot,
        after: {
          courier: courier || courierName,
          courierMode: "manual",
          trackingCode,
          shipmentStatus: nextShipmentStatus,
          orderStatus: nextOrderStatus,
          reason: reason || "Manual delivery update",
        },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json({
      ok: true,
      orderCourier: {
        courier: courier || courierName,
        courierMode: "manual",
        trackingCode,
        consignmentId: order.consignmentId || "",
        shipmentStatus: nextShipmentStatus,
      },
      orderStatus: nextOrderStatus,
    });
  } catch (error) {
    console.error("PATCH /api/admin/orders/[id]/shipment error:", error);
    return NextResponse.json(
      { error: "Could not save delivery information." },
      { status: 500 }
    );
  }
}
