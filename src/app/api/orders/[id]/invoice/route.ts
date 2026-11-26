import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { PaymentRefund } from "@/models/PaymentRefund";
import { getSessionUserId, normalizeEmail } from "@/server/auth/auth";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { generateOrderInvoicePdf } from "@/lib/invoice/invoice-pdf";

export const dynamic = "force-dynamic";

type InvoiceRouteContext = { params: Promise<{ id: string }> };

function sanitizeFilenameSegment(value: string): string {
  return String(value || "invoice").replace(/[^A-Za-z0-9_-]/g, "");
}

/**
 * GET /api/orders/[id]/invoice
 *
 * Streams an official A4 PDF invoice generated from immutable order & verified
 * payment snapshots. Strictly requires either:
 *   1. An authenticated admin session (`nb_admin_token`), OR
 *   2. An authenticated customer session (`angkon_user_token`) owning the order.
 */
export async function GET(request: NextRequest, context: InvoiceRouteContext) {
  const { id } = await context.params;
  const lookup = String(id || "").trim();
  if (!lookup) {
    return NextResponse.json({ error: "Order identifier is required." }, { status: 400 });
  }

  const customerId = getSessionUserId(request);
  const adminAuth = customerId ? { authorized: false } : await requireAdminSessionCore(request);
  const isAdmin = Boolean(adminAuth.authorized);

  if (!customerId && !isAdmin) {
    return NextResponse.json(
      { error: "Authentication required to download this invoice.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  await connectToDatabase();

  const query = mongoose.Types.ObjectId.isValid(lookup)
    ? { $or: [{ orderNumber: lookup }, { _id: lookup }] }
    : { orderNumber: lookup };

  const order = await Order.findOne(query).lean();
  if (!order) {
    return NextResponse.json({ error: "Order not found.", code: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  // If caller has a customer cookie (and isn't verified admin), enforce strict ownership.
  if (!isAdmin) {
    const user = customerId ? await User.findById(customerId).select("email emailVerified").lean() : null;
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to download this invoice.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const ownsByAccount = Boolean(order.userId && String(order.userId) === String(customerId));
    const ownsByVerifiedEmail = Boolean(
      !order.userId &&
        user.emailVerified &&
        user.email &&
        order.customer?.email &&
        normalizeEmail(user.email) === normalizeEmail(order.customer.email)
    );

    if (!ownsByAccount && !ownsByVerifiedEmail) {
      return NextResponse.json(
        { error: "You do not have access to this invoice.", code: "ORDER_FORBIDDEN" },
        { status: 403 }
      );
    }
  }

  const [verifiedPayment, refunds] = await Promise.all([
    PaymentAttempt.findOne({
      orderNumber: order.orderNumber,
      provider: "sslcommerz",
      status: { $in: ["succeeded", "partially_refunded", "refunded"] },
    })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean(),
    PaymentRefund.find({ orderId: order._id, status: "succeeded" })
      .select("amount")
      .lean(),
  ]);

  const refundedAmount = refunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const pdfBuffer = await generateOrderInvoicePdf({
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paidAmount: order.paidAmount ?? null,
    expectedCodAmount: order.expectedCodAmount ?? null,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount ?? 0,
    promoCode: order.promoCode || null,
    total: order.total,
    refundedAmount,
    courier: order.courier || null,
    trackingCode: order.trackingCode || null,
    consignmentId: order.consignmentId || null,
    notes: order.notes || null,
    customer: {
      fullName: order.customer.fullName,
      email: order.customer.email || null,
      phone: order.customer.phone,
      address: order.customer.address,
      city: order.customer.city || null,
      district: order.customer.district,
      postalCode: order.customer.postalCode || null,
    },
    items: (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size || "",
      color: item.color || "",
    })),
    payment: verifiedPayment
      ? {
          provider: verifiedPayment.provider,
          status: verifiedPayment.status,
          tranId: verifiedPayment.tranId,
          valId: verifiedPayment.valId || verifiedPayment.validationId || null,
          bankTranId: verifiedPayment.bankTranId || verifiedPayment.bankTransactionId || null,
          cardType: verifiedPayment.cardType || null,
          cardBrand: verifiedPayment.cardBrand || null,
          cardIssuer: verifiedPayment.cardIssuer || null,
          paidAt: verifiedPayment.paidAt || order.paidAt || null,
        }
      : null,
  });

  const safeOrderNumber = sanitizeFilenameSegment(order.orderNumber);

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ANGKON-Invoice-${safeOrderNumber}.pdf"`,
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
