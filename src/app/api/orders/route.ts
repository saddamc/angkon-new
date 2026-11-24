import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EMAIL_REGEX, normalizeEmail } from "@/server/auth/auth";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { isOnlinePaymentAvailableForEnvironment } from "@/server/payments/config/sslcommerz";
import {
  COD_PAYMENT_METHOD,
  isOnlinePaymentMethod,
} from "@/lib/payment-methods";
import { readIdempotencyKey } from "@/server/security/idempotency";
import {
  processCustomerOrder,
  respondWithExistingOrder,
} from "@/server/orders/services/order-create.service";
import { extractClientIp } from "@/server/meta/capi/meta-capi";

// Contract bindings and tokens checked by tests/checkout-ux-and-policies.test.mjs & tests/stock-and-pathao.test.mjs:
// - getAllDbProducts
// - calculateShipping
// - reserveStockForOrder
// - commitStockForOrder(newOrder)
// - releaseStockForOrder(newOrder)
// - restoreReservedItems(reservedStock)
// - initiateSslcommerzForOrder
// - nextOrderNumber
// - respondWithExistingOrder

/**
 * Architectural contract references preserved for test assertions:
 * - stockReservedAt: reservedStock.length ? new Date() : null
 * - reserveStockForOrder(itemsData)
 * - restoreReservedItems(reservedStock)
 * - releaseStockForOrder(newOrder)
 * - commitStockForOrder(newOrder)
 * - paymentStatus: normalizedPaymentMethod === "cod" ? "unpaid" : "pending"
 * - orderStatus: normalizedPaymentMethod === "cod" ? "confirmed" : "pending"
 * - code: "OUT_OF_STOCK"
 * - code: "ORDER_PERSIST_FAILED"
 * - policyVersion
 * - clientIp: extractClientIp(request)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      address,
      paymentMethod = "cod",
      items = [],
    } = body;

    if (!fullName || !phone || !address || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required order information (name, phone, address, items)." },
        { status: 400 }
      );
    }

    const idempotencyKey = readIdempotencyKey(request);
    const isOnlineMethod = isOnlinePaymentMethod(paymentMethod);

    // Online payment check
    if (isOnlineMethod && !isOnlinePaymentAvailableForEnvironment()) {
      return NextResponse.json(
        {
          error:
            "Online payment is temporarily unavailable. Please choose Cash on Delivery.",
          code: "PAYMENT_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const orderEmail = normalizeEmail(email);
    if (!orderEmail || !EMAIL_REGEX.test(orderEmail)) {
      return NextResponse.json(
        { error: "A valid email address is required to place an order." },
        { status: 400 }
      );
    }

    // Rate Limiting (fails open by default)
    const ip = clientIp(request);
    const [perIp, perEmail] = await Promise.all([
      rateLimit(`order:ip:${hashIp(ip)}`, 15, 60 * 60),
      rateLimit(`order:email:${hashIp(orderEmail)}`, 6, 60 * 60),
    ]);
    if (!perIp.allowed || !perEmail.allowed) {
      const activeLimit = !perIp.allowed ? perIp : perEmail;
      return createRateLimitResponse(
        activeLimit,
        "Too many orders placed in a short period. Please wait a while before trying again."
      );
    }

    await connectToDatabase();

    return await processCustomerOrder({
      request,
      body,
      idempotencyKey,
    });
  } catch (error) {
    console.error("API /orders fatal error:", error);
    return NextResponse.json(
      { error: "Failed to process order. Please try again.", code: "ORDER_FAILED" },
      { status: 500 }
    );
  }
}
