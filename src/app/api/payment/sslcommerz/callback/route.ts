import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/server/auth/auth";
import { verifyPaymentReturnToken } from "@/server/payments/return-token";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { securityLog } from "@/server/security/security-log";
import { ProcessSuccessService } from "@/server/payments/services/process-success";
import { ProcessFailureService } from "@/server/payments/services/process-failure";
import { ProcessCancellationService } from "@/server/payments/services/process-cancellation";

export const dynamic = "force-dynamic";

/**
 * @deprecated Legacy unified callback route.
 * Canonical endpoints: /api/payments/sslcommerz/success, /api/payments/sslcommerz/fail, /api/payments/sslcommerz/cancel
 *
 * SSLCOMMERZ return URL handler (legacy path).
 *
 * Kept for sessions created before the centralized module was introduced.
 * It performs no settlement of its own: every notification is handed to the
 * same domain services used by the `/api/payments/sslcommerz/*` routes.
 * A browser redirect alone is never proof of payment.
 */
export async function POST(request: NextRequest) {
  return handleCallback(request);
}

export async function GET(request: NextRequest) {
  return handleCallback(request);
}

async function handleCallback(request: NextRequest) {
  const ip = clientIp(request);
  const limit = await rateLimit(`sslcommerz:callback:${hashIp(ip)}`, 120, 60);
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many callback requests.");
  }

  const appBaseUrl = getSiteUrl(request);
  const { searchParams } = new URL(request.url);

  let tranId = searchParams.get("tran_id") || "";
  let valId = searchParams.get("val_id") || "";
  let status = searchParams.get("status") || "";
  let returnToken = searchParams.get("token") || "";

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await request.json().catch(() => ({}));
      tranId = json.tran_id || tranId;
      valId = json.val_id || valId;
      status = json.status || status;
      returnToken = json.token || returnToken;
    } else {
      const formData = await request.formData().catch(() => new FormData());
      tranId = formData.get("tran_id")?.toString() || tranId;
      valId = formData.get("val_id")?.toString() || valId;
      status = formData.get("status")?.toString() || status;
      returnToken = formData.get("token")?.toString() || returnToken;
    }
  }

  const normalizedStatus = status.trim().toUpperCase();
  const attemptId = searchParams.get("attemptId") || null;

  if (!tranId) {
    return NextResponse.redirect(`${appBaseUrl}/checkout?error=invalid_payment_callback`);
  }

  // A forged cross-order return URL is rejected before any state change. The
  // val_id validator remains the actual payment proof.
  if (returnToken && !verifyPaymentReturnToken(returnToken, tranId)) {
    securityLog("payment.verification_rejected", {
      provider: "sslcommerz",
      source: "return",
      reason: "invalid-return-token",
    });
    return NextResponse.redirect(`${appBaseUrl}/checkout?error=invalid_payment_callback`);
  }

  const isFailure = normalizedStatus === "FAIL" || normalizedStatus === "FAILED";
  const isCancellation = normalizedStatus === "CANCEL" || normalizedStatus === "CANCELLED";

  let redirectPath: string;

  if (isFailure || isCancellation) {
    // The failure/cancel redirect is only a hint. Only a signed return token
    // binds it to this checkout; the service additionally requires a
    // validator-confirmed val_id before downgrading the attempt.
    if (!returnToken) {
      securityLog("payment.verification_rejected", {
        provider: "sslcommerz",
        source: "return",
        reason: "unsigned-failure-notification",
      });
      return NextResponse.redirect(`${appBaseUrl}/checkout?error=invalid_payment_callback`);
    }

    const result = isFailure
      ? await ProcessFailureService.processCallback({
          attemptId,
          tranId,
          valId,
          reason: searchParams.get("reason"),
          payload: { status },
        })
      : await ProcessCancellationService.processCallback({
          attemptId,
          tranId,
          valId,
          reason: searchParams.get("reason"),
          payload: { status },
        });

    redirectPath = result.redirectUrl;
  } else if (["SUCCESS", "VALID", "VALIDATED"].includes(normalizedStatus)) {
    const result = await ProcessSuccessService.processCallback({
      attemptId,
      tranId,
      valId,
      payload: { status, val_id: valId },
    });
    redirectPath = result.redirectUrl;
  } else {
    redirectPath = `/checkout?error=verification_failed&order=${encodeURIComponent(tranId)}`;
  }

  return NextResponse.redirect(new URL(redirectPath, appBaseUrl), 303);
}
