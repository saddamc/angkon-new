import { NextRequest, NextResponse } from "next/server";
import { withCustomerRoute } from "@/server/http/with-customer-route";
import {
  getCancellationSnapshot,
  OrderCancellationError,
  requestCustomerCancellation,
} from "@/server/orders/services/order-cancellation.service";

export const dynamic = "force-dynamic";

function cancellationError(error: unknown) {
  if (error instanceof OrderCancellationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  console.error("Customer cancellation error:", error);
  return NextResponse.json({ error: "Could not process the cancellation request.", code: "CANCELLATION_FAILED" }, { status: 500 });
}

export const GET = withCustomerRoute(
  async (_request, context) => {
    try {
      const id = String(context.params?.id || "");
      const snapshot = await getCancellationSnapshot(id);
      const ownsByAccount = Boolean(context.userId && snapshot.order.userId && String(snapshot.order.userId) === String(context.userId));
      const ownsByVerifiedEmail = Boolean(
        context.user?.emailVerified && context.user?.email && !snapshot.order.userId && snapshot.order.customer?.email &&
          String(context.user.email).trim().toLowerCase() === String(snapshot.order.customer.email).trim().toLowerCase(),
      );
      if (!ownsByAccount && !ownsByVerifiedEmail) {
        return NextResponse.json({ error: "You do not have access to this order.", code: "ORDER_FORBIDDEN" }, { status: 403 });
      }
      return NextResponse.json(
        {
          orderNumber: snapshot.order.orderNumber,
          orderStatus: snapshot.order.orderStatus,
          paymentStatus: snapshot.order.paymentStatus,
          shipmentStatus: snapshot.order.shipmentStatus,
          cancellationRequest: snapshot.order.cancellationRequest || null,
          cancellationDetails: snapshot.order.cancellationDetails || null,
          eligibility: snapshot.eligibility,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return cancellationError(error);
    }
  },
  { requireAuth: true },
);

export const POST = withCustomerRoute(
  async (request: NextRequest, context) => {
    try {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const id = String(context.params?.id || "");
      const result = await requestCustomerCancellation({
        orderIdOrNumber: id,
        customerId: String(context.userId || ""),
        customerEmail: context.user?.emailVerified ? context.user.email : null,
        reason: typeof body.reason === "string" ? body.reason : "",
        reasonCode: typeof body.reasonCode === "string" ? body.reasonCode : null,
      });
      return NextResponse.json(
        {
          ok: true,
          status: "requested",
          orderNumber: result.order.orderNumber,
          cancellationRequest: result.order.cancellationRequest,
          eligibility: result.eligibility,
          message: "Your cancellation request was sent for review.",
        },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return cancellationError(error);
    }
  },
  { requireAuth: true },
);
