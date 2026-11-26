import { NextRequest, NextResponse } from "next/server";
import { withCustomerRoute } from "@/server/http/with-customer-route";
import { publicUser } from "@/server/auth/account";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { validateAccountProfileInput } from "@/lib/account-validation";

export const dynamic = "force-dynamic";

export const PATCH = withCustomerRoute(
  async (request: NextRequest, context) => {
    const ip = clientIp(request);
    const limit = await rateLimit(
      `account-profile:user:${String(context.userId)}:ip:${hashIp(ip)}`,
      20,
      15 * 60
    );
    if (!limit.allowed) {
      return createRateLimitResponse(limit, "Too many profile updates. Please wait a few minutes.");
    }

    const user = context.user!;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = validateAccountProfileInput(body, user.name);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: 400 });
    }

    user.name = parsed.name;
    if (parsed.phone !== undefined) {
      user.phone = parsed.phone;
    }
    await user.save();

    return NextResponse.json(
      { ok: true, user: publicUser(user) },
      { headers: { "Cache-Control": "no-store" } }
    );
  },
  { requireAuth: true }
);
