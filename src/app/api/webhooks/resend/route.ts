import { NextRequest, NextResponse } from "next/server";
import { verifyResendWebhookSignature } from "@/lib/email/resend-webhook";
import { applyResendWebhookEvent } from "@/server/email/email-outbox.service";
import { rateLimit, createRateLimitResponse, clientIp, hashIp } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/resend
 *
 * Receives Resend email lifecycle webhooks (`email.sent`, `email.delivered`,
 * `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`).
 * Reads raw request text before JSON parsing so Svix HMAC-SHA256 verification
 * remains exact.
 */
export async function POST(request: NextRequest) {
  const limit = await rateLimit(`resend:webhook:${hashIp(clientIp(request))}`, 300, 60);
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many webhook requests.");
  }

  const webhookSecret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "RESEND_WEBHOOK_SECRET is not configured." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  const verified = verifyResendWebhookSignature({
    rawBody,
    headers: { svixId, svixTimestamp, svixSignature },
    webhookSecret,
  });

  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.error }, { status: 401 });
  }

  const result = await applyResendWebhookEvent(svixId!, verified.event);
  return NextResponse.json({
    ok: true,
    matched: result.matched,
    duplicate: result.duplicate,
    status: result.status || null,
  });
}
