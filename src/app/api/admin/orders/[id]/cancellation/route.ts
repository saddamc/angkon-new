import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { clientIp } from "@/server/security/rate-limit";
import {
  executeOrderCancellation,
  getCancellationSnapshot,
  OrderCancellationError,
  rejectCustomerCancellation,
} from "@/server/orders/services/order-cancellation.service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof OrderCancellationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  console.error("Admin cancellation error:", error);
  return NextResponse.json({ error: "Could not process the cancellation action.", code: "CANCELLATION_FAILED" }, { status: 500 });
}

async function authorize(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return { auth, response: auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  await connectToDatabase();
  return { auth, response: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, response } = await authorize(request);
  if (response) return response;
  try {
    const { id } = await params;
    const snapshot = await getCancellationSnapshot(id);
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, response } = await authorize(request);
  if (response) return response;
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const actor = auth.user || "admin";
    const refundBody = body.refund && typeof body.refund === "object"
      ? body.refund as { amount?: unknown; channel?: unknown; method?: unknown; reference?: unknown; refundDate?: unknown }
      : null;

    if (action === "reject") {
      const updated = await rejectCustomerCancellation({
        orderIdOrNumber: id,
        reviewer: actor,
        reviewNote: typeof body.reviewNote === "string" ? body.reviewNote : "Cancellation request rejected.",
      });
      return NextResponse.json({ ok: true, action, order: updated });
    }

    if (action !== "approve" && action !== "cancel_direct") {
      return NextResponse.json({ error: "Action must be approve, reject or cancel_direct.", code: "INVALID_ACTION" }, { status: 400 });
    }

    const result = await executeOrderCancellation({
      orderIdOrNumber: id,
      actor,
      actorType: "admin",
      reason: typeof body.reason === "string" ? body.reason : "Cancellation approved by administrator.",
      reasonCode: typeof body.reasonCode === "string" ? body.reasonCode : null,
      decision: body.decision === "cancel_only" ? "cancel_only" : "cancel_and_refund",
      refundAmount: refundBody && typeof refundBody.amount === "number" ? refundBody.amount : null,
      manualRefund:
        refundBody && body.decision !== "cancel_only" && refundBody.channel === "manual_offline"
          ? {
              method: typeof refundBody.method === "string" ? refundBody.method : null,
              reference: typeof refundBody.reference === "string" ? refundBody.reference : null,
              refundDate: typeof refundBody.refundDate === "string" ? refundBody.refundDate : null,
              adminNote: typeof body.adminNote === "string" ? body.adminNote : null,
            }
          : null,
      requirePendingRequest: action === "approve",
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") || "",
    });

    return NextResponse.json({
      ok: true,
      action,
      order: result.order,
      stockResult: result.stockResult,
      refundResult: result.refundResult,
      eligibility: result.eligibility,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
