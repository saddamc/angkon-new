import { NextRequest, NextResponse } from "next/server";
import { ProcessFailureService } from "@/server/payments/services/process-failure";
import { parseGatewayCallback, firstDefined } from "@/server/payments/parse-callback";
import { checkDualRateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { getSiteUrl } from "@/server/auth/auth";

async function handleCallback(req: NextRequest) {
  const limit = await checkDualRateLimit({
    request: req,
    prefix: "pay_callback_fail",
    ipLimit: { limit: 120, windowSeconds: 60 },
  });
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many callback requests.");
  }

  const payload = await parseGatewayCallback(req);
  const attemptId = firstDefined(payload.attemptId, req.nextUrl.searchParams.get("attemptId"));
  const tranId = firstDefined(payload.tran_id, payload.tranId, req.nextUrl.searchParams.get("tranId"));
  const valId = firstDefined(payload.val_id, payload.valId, req.nextUrl.searchParams.get("valId"));
  const reason = firstDefined(payload.error, payload.failedreason, req.nextUrl.searchParams.get("reason"));

  const result = await ProcessFailureService.processCallback({
    attemptId,
    tranId,
    valId,
    reason,
    payload,
  });

  return NextResponse.redirect(new URL(result.redirectUrl, getSiteUrl(req)), 303);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}
