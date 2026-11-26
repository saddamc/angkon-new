import { NextRequest, NextResponse } from "next/server";
import { withAdminRoute } from "@/server/http/with-admin-route";
import { EmailDelivery } from "@/models/EmailDelivery";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { retryEmailDeliveryById } from "@/server/email/email-outbox.service";

export const dynamic = "force-dynamic";

const adminGet = withAdminRoute(async (_request, context) => {
  const orderNumber = String(context.params?.id || "").trim();
  const deliveries = await EmailDelivery.find({ orderNumber })
    .select(
      "deduplicationKey notificationType recipient subject hasPdfAttachment status attemptCount maxAttempts nextAttemptAt providerMessageId providerAcceptedAt deliveredAt failedAt lastEventType lastError failureCategory createdAt updatedAt"
    )
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(
    { ok: true, deliveries },
    { headers: { "Cache-Control": "no-store" } }
  );
});

const adminPost = withAdminRoute(async (request: NextRequest, context) => {
  const orderNumber = String(context.params?.id || "").trim();
  const body = (await request.json().catch(() => ({}))) as { deliveryId?: string };
  const deliveryId = typeof body.deliveryId === "string" ? body.deliveryId.trim() : "";

  if (!deliveryId) {
    return NextResponse.json({ ok: false, error: "deliveryId is required." }, { status: 400 });
  }

  const result = await retryEmailDeliveryById(deliveryId);

  await AdminAuditLog.create({
    actor: context.user,
    action: "order.email.retry",
    targetType: "order",
    targetId: orderNumber,
    after: { deliveryId, ok: result.ok, status: result.status, error: result.error || null },
  }).catch(() => {});

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteCtx) {
  return adminGet(request, context);
}

export async function POST(request: NextRequest, context: RouteCtx) {
  return adminPost(request, context);
}
