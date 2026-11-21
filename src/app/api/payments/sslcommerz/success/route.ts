import { NextRequest, NextResponse } from "next/server";
import { ProcessSuccessService } from "@/server/payments/services/process-success";
import { parseGatewayCallback, firstDefined } from "@/server/payments/parse-callback";
import { checkDualRateLimit, createRateLimitResponse } from "@/server/rate-limit";
import { getSiteUrl } from "@/server/auth";

async function handleCallback(req: NextRequest) {
  const limit = await checkDualRateLimit({
    request: req,
    prefix: "pay_callback_success",
    ipLimit: { limit: 120, windowSeconds: 60 },
  });
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many callback requests.");
  }

  const payload = await parseGatewayCallback(req);
  const attemptId = firstDefined(payload.attemptId, req.nextUrl.searchParams.get("attemptId"));
  const tranId = firstDefined(payload.tran_id, payload.tranId, req.nextUrl.searchParams.get("tranId"));
  const valId = firstDefined(payload.val_id, payload.valId, req.nextUrl.searchParams.get("valId"));

  const result = await ProcessSuccessService.processCallback({
    attemptId,
    tranId,
    valId,
    payload,
  });

  const redirectUrl = new URL(result.redirectUrl, getSiteUrl(req));
  return NextResponse.redirect(redirectUrl, 303);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}
