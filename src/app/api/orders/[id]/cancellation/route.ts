import { NextRequest, NextResponse } from "next/server";
import { withCustomerRoute } from "@/server/http/with-customer-route";
import { clientIp } from "@/server/security/rate-limit";
import {
  getCancellationSnapshot,
  OrderCancellationError,
  requestCustomerCancellation,
  withdrawCustomerCancellation,
} from "@/server/orders/services/order-cancellation.service";

export const dynamic = "force-dynamic";

function cancellationError(error: unknown) {
  if (error instanceof OrderCancellationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  console.error("Customer cancellation error:", error);
  return NextResponse.json({ error: "Could not process the cancellation request.", code: "CANCELLATION_FAILED" }, { status: 500 });
}

const customerGet = withCustomerRoute(
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

const customerPost = withCustomerRoute(
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
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
      return NextResponse.json(
        {
          ok: true,
          autoAccepted: result.autoAccepted,
          status: result.autoAccepted ? "cancelled" : "requested",
          orderNumber: result.order.orderNumber,
          orderStatus: result.order.orderStatus,
          cancellationRequest: result.order.cancellationRequest,
          cancellationDetails: result.order.cancellationDetails || null,
          eligibility: result.eligibility,
          message: result.autoAccepted
            ? "Your order has been cancelled and reserved stock released."
            : "Your cancellation & refund request was sent for administrator review.",
        },
        { status: result.autoAccepted ? 200 : 202, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return cancellationError(error);
    }
  },
  { requireAuth: true },
);

const customerDelete = withCustomerRoute(
  async (_request: NextRequest, context) => {
    try {
      const id = String(context.params?.id || "");
      const updated = await withdrawCustomerCancellation({
        orderIdOrNumber: id,
        customerId: String(context.userId || ""),
        customerEmail: context.user?.emailVerified ? context.user.email : null,
      });
      return NextResponse.json(
        {
          ok: true,
          status: "withdrawn",
          orderNumber: updated.orderNumber,
          cancellationRequest: updated.cancellationRequest,
          message: "Cancellation request withdrawn. Your order remains active.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return cancellationError(error);
    }
  },
  { requireAuth: true },
);

type CancellationRouteContext = { params: Promise<{ id: string }> };

// Keep the Next.js dynamic route context required at the exported boundary;
// the shared customer wrapper remains reusable for both static and dynamic
// customer routes.
export async function GET(request: NextRequest, context: CancellationRouteContext) {
  return customerGet(request, context);
}

export async function POST(request: NextRequest, context: CancellationRouteContext) {
  return customerPost(request, context);
}

export async function DELETE(request: NextRequest, context: CancellationRouteContext) {
  return customerDelete(request, context);
}
