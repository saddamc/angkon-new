import { NextRequest, NextResponse } from "next/server";
import { withCustomerRoute } from "@/server/http/with-customer-route";
import { publicUser } from "@/server/auth/account";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { ensureSingleDefaultAddress, validateAccountAddressInput } from "@/lib/account-validation";

export const dynamic = "force-dynamic";

const MAX_SAVED_ADDRESSES = 10;

export const GET = withCustomerRoute(
  async (_request, context) => {
    const user = context.user!;
    return NextResponse.json(
      { ok: true, addresses: user.addresses || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  },
  { requireAuth: true }
);

export const POST = withCustomerRoute(
  async (request: NextRequest, context) => {
    const ip = clientIp(request);
    const limit = await rateLimit(
      `account-addresses:user:${String(context.userId)}:ip:${hashIp(ip)}`,
      30,
      15 * 60
    );
    if (!limit.allowed) {
      return createRateLimitResponse(limit, "Too many address changes. Please wait a moment.");
    }

    const user = context.user!;
    const current = Array.isArray(user.addresses) ? [...user.addresses] : [];
    if (current.length >= MAX_SAVED_ADDRESSES) {
      return NextResponse.json(
        { error: `You can store up to ${MAX_SAVED_ADDRESSES} saved addresses.`, code: "ADDRESS_LIMIT_REACHED" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = validateAccountAddressInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: "INVALID_ADDRESS" }, { status: 400 });
    }

    const shouldBeDefault = current.length === 0 || Boolean(parsed.address.isDefault);
    current.push(parsed.address);
    ensureSingleDefaultAddress(current, shouldBeDefault ? current.length - 1 : undefined);

    user.addresses = current;
    user.markModified("addresses");
    await user.save();

    return NextResponse.json(
      { ok: true, user: publicUser(user), addresses: user.addresses },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  },
  { requireAuth: true }
);

export const PATCH = withCustomerRoute(
  async (request: NextRequest, context) => {
    const ip = clientIp(request);
    const limit = await rateLimit(
      `account-addresses:user:${String(context.userId)}:ip:${hashIp(ip)}`,
      30,
      15 * 60
    );
    if (!limit.allowed) {
      return createRateLimitResponse(limit, "Too many address changes. Please wait a moment.");
    }

    const user = context.user!;
    const current = Array.isArray(user.addresses) ? [...user.addresses] : [];
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const index = typeof body.index === "number" ? Math.trunc(body.index) : Number(body.index);

    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      return NextResponse.json({ error: "Address entry not found.", code: "ADDRESS_NOT_FOUND" }, { status: 404 });
    }

    if (body.action === "set_default") {
      ensureSingleDefaultAddress(current, index);
    } else {
      const parsed = validateAccountAddressInput(body);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error, code: "INVALID_ADDRESS" }, { status: 400 });
      }
      const keepDefault = Boolean(parsed.address.isDefault) || Boolean(current[index]?.isDefault);
      current[index] = {
        ...parsed.address,
        isDefault: keepDefault,
      };
      ensureSingleDefaultAddress(current, parsed.address.isDefault ? index : undefined);
    }

    user.addresses = current;
    user.markModified("addresses");
    await user.save();

    return NextResponse.json(
      { ok: true, user: publicUser(user), addresses: user.addresses },
      { headers: { "Cache-Control": "no-store" } }
    );
  },
  { requireAuth: true }
);

export const DELETE = withCustomerRoute(
  async (request: NextRequest, context) => {
    const ip = clientIp(request);
    const limit = await rateLimit(
      `account-addresses:user:${String(context.userId)}:ip:${hashIp(ip)}`,
      30,
      15 * 60
    );
    if (!limit.allowed) {
      return createRateLimitResponse(limit, "Too many address changes. Please wait a moment.");
    }

    const user = context.user!;
    const current = Array.isArray(user.addresses) ? [...user.addresses] : [];

    const queryIndex = request.nextUrl.searchParams.get("index");
    let rawIndex: unknown = queryIndex !== null ? Number(queryIndex) : undefined;
    if (rawIndex === undefined) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      rawIndex = body.index;
    }

    const index = typeof rawIndex === "number" ? Math.trunc(rawIndex) : Number(rawIndex);
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      return NextResponse.json({ error: "Address entry not found.", code: "ADDRESS_NOT_FOUND" }, { status: 404 });
    }

    const [removed] = current.splice(index, 1);
    if (current.length > 0 && (removed?.isDefault || !current.some((a) => Boolean(a.isDefault)))) {
      ensureSingleDefaultAddress(current, 0);
    }

    user.addresses = current;
    user.markModified("addresses");
    await user.save();

    return NextResponse.json(
      { ok: true, user: publicUser(user), addresses: user.addresses },
      { headers: { "Cache-Control": "no-store" } }
    );
  },
  { requireAuth: true }
);
