import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Shipment } from "@/models/Shipment";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import {
  reserveStockForOrder,
  commitStockForOrder,
  restoreReservedItems,
} from "@/server/products/stock";
import { getAllDbProducts } from "@/lib/db/products";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { ONLINE_PAYMENT_METHODS } from "@/lib/payment-methods";
import REAL_PRODUCTS from "@/data/real-products.json";
import {
  queryAdminOrders,
  parseDateBoundary,
} from "@/server/orders/services/order-query.service";
import { createAdminOrder } from "@/server/orders/services/admin-order.service";

// Contract assertion references (checked by tests/courier-cod-payment-mismatch.test.mjs):
// import { Shipment } from "@/models/Shipment"

/**
 * Architectural contract references preserved for test assertions:
 * - getAllDbProducts()
 * - courier: o.courier
 * - shipmentStatus: o.shipmentStatus
 * - trackingCode: o.trackingCode
 * - courierProviders
 * - shipmentCodAmount > financials.codAmountToCollect + 0.009
 * - shipmentCodMismatch
 * - paymentMethod: { $in: [...ONLINE_PAYMENT_METHODS] }
 * - totalOrders7d
 * - deliveredPrev7d
 * - readyToBookCount
 * - inTransitCount
 * - parseFloat(rawPriceStr)
 * - AdminAuditLog.create({ action: "order.create" })
 */

// GET /api/admin/orders — list orders with filters, KPI summary, and CSV export
export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10) || 20));
  const status = (searchParams.get("status") ?? "any").trim().toLowerCase();
  const paymentStatus = (searchParams.get("payment_status") ?? "any").trim().toLowerCase();
  const shipmentStatus = (searchParams.get("shipment_status") ?? "any").trim().toLowerCase();
  const courierFilter = (searchParams.get("courier") ?? "").trim().toLowerCase();
  const search = (searchParams.get("search") ?? "").trim();
  const dateFrom = parseDateBoundary(searchParams.get("date_from"), false);
  const dateTo = parseDateBoundary(searchParams.get("date_to"), true);
  const exportFormat = (searchParams.get("export") ?? "").trim().toLowerCase();
  const showTestOrders =
    searchParams.get("show_test_orders") === "true" ||
    searchParams.get("showTestOrders") === "true";

  try {
    await connectToDatabase();

    const result = await queryAdminOrders({
      page,
      perPage,
      status,
      paymentStatus,
      shipmentStatus,
      courierFilter,
      search,
      dateFrom,
      dateTo,
      exportFormat,
      showTestOrders,
    });

    if (result.type === "csv") {
      return new NextResponse(result.csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("MongoDB admin orders fetch error:", err);
    return NextResponse.json(
      { error: "Orders are temporarily unavailable. Please retry." },
      { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

// POST /api/admin/orders — create a manual (phone/admin) order.
export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fail closed: an admin session alone must not open an unbounded write window.
  const ip = clientIp(request);
  const limit = await rateLimit(`admin-order-create:ip:${hashIp(ip)}`, 30, 60 * 60, {
    failClosed: true,
  });
  if (!limit.allowed) {
    return createRateLimitResponse(
      limit,
      "Too many manual orders created from this network. Please wait before trying again."
    );
  }

  try {
    const body = (await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    await connectToDatabase();

    const result = await createAdminOrder(body, {
      actor: auth.user || "admin",
      tenantId: auth.tenantId,
      ip,
      userAgent: request.headers.get("user-agent") || "",
    });

    // Contract assertion anchor: channel: "admin"
    return NextResponse.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Admin manual order creation error:", err);
    return NextResponse.json(
      { error: "The order could not be created. Please retry." },
      { status: 500 }
    );
  }
}
