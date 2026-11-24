import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
import { getCourierTrackingUrl } from "@/server/courier/core/tracking";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  // Return last 10 digits to match with or without 880 / 0
  return digits.slice(-10);
}

function maskName(name: string): string {
  if (!name) return "Valued Customer";
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 2) return part;
      return part[0] + "*".repeat(part.length - 2) + part[part.length - 1];
    })
    .join(" ");
}

export async function GET(req: NextRequest) {
  try {
    const ip = clientIp(req);
    // 30 track attempts per 10 minutes per IP
    const rl = await rateLimit(`order-track:${ip}`, 30, 600);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many tracking requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds || 60) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = (searchParams.get("orderNumber") || "").trim();
    const phone = (searchParams.get("phone") || "").trim();

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { ok: false, error: "Both Order Number and Phone Number are required." },
        { status: 400 }
      );
    }

    const searchDigits = normalizePhone(phone);
    if (searchDigits.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid phone number." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Look up by exact order number (case-insensitive)
    const escapedOrderNumber = orderNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const order = await Order.findOne({
      orderNumber: { $regex: new RegExp(`^${escapedOrderNumber}$`, "i") },
    }).lean() as any;

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "No order found matching this Order Number and Phone Number." },
        { status: 404 }
      );
    }

    // Verify phone matches billing or shipping phone
    const billingPhone = normalizePhone(order.billing?.phone || "");
    const shippingPhone = normalizePhone(order.shipping?.phone || "");
    const customerPhone = normalizePhone(order.customer?.phone || "");

    const phoneMatched =
      (billingPhone && billingPhone.endsWith(searchDigits)) ||
      (shippingPhone && shippingPhone.endsWith(searchDigits)) ||
      (customerPhone && customerPhone.endsWith(searchDigits));

    if (!phoneMatched) {
      return NextResponse.json(
        { ok: false, error: "No order found matching this Order Number and Phone Number." },
        { status: 404 }
      );
    }

    // Retrieve active shipment if exists
    let activeShipment: any = null;
    if (order._id) {
      activeShipment = await Shipment.findOne({
        orderId: order._id,
        status: { $ne: "cancelled" },
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    const fullName =
      order.customer?.fullName ||
      [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ") ||
      "Customer";

    const trackingUrl = getCourierTrackingUrl(
      order.courier || activeShipment?.provider,
      order.trackingCode || activeShipment?.trackingCode,
      order.consignmentId || activeShipment?.consignmentId
    );

    const isMock = Boolean(
      order.courierIsMock ||
      order.courierOperatingMode === "mock" ||
      (order.trackingCode && order.trackingCode.startsWith("MOCK-"))
    );

    // Filter line items for public display (name, quantity, price, image)
    const rawItems = order.items || order.line_items || [];
    const items = rawItems.map((it: any) => ({
      name: it.name || it.title || "Product item",
      quantity: Number(it.quantity || 1),
      price: Number(it.price || it.total || 0),
      image: it.image?.src || it.image || null,
    }));

    const total = Number(order.total || 0);
    const paidAmount = Number(order.paidAmount || (order.paymentStatus === "paid" ? total : 0));
    const outstandingCod =
      order.paymentStatus === "paid" ? 0 : Math.max(0, total - paidAmount);

    return NextResponse.json({
      ok: true,
      tracking: {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus || "pending",
        paymentMethod: order.paymentMethod || "cod",
        shipmentStatus: order.shipmentStatus || (activeShipment ? activeShipment.status : "not_booked"),
        courier: order.courier || (activeShipment ? activeShipment.provider : null),
        trackingCode: order.trackingCode || (activeShipment ? activeShipment.trackingCode : null),
        consignmentId: order.consignmentId || (activeShipment ? activeShipment.consignmentId : null),
        trackingUrl,
        isMock,
        recipient: {
          maskedName: maskName(fullName),
          city: order.billing?.city || order.shipping?.city || "Bangladesh",
        },
        financials: {
          total,
          paidAmount,
          outstandingCod,
        },
        items,
        events: (activeShipment?.events || []).map((ev: any) => ({
          status: ev.status,
          note: ev.note,
          at: ev.at,
        })),
      },
    });
  } catch (error: any) {
    console.error("[Order Tracking API Error]:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred while tracking your order." },
      { status: 500 }
    );
  }
}
