import { NextRequest, NextResponse } from "next/server";
import { getCheckoutSettings } from "@/server/checkout-settings";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/promo/validate { code, subtotal }
 * Validates a promo code against active store discounts.
 * Rate-limited to prevent brute-force discount code guessing.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const limit = await rateLimit(`promo-validate:ip:${hashIp(ip)}`, 20, 60);
    if (!limit.allowed) {
      return createRateLimitResponse(
        limit,
        "Too many promo code attempts. Please wait a minute before trying again."
      );
    }

    const body = (await request.json().catch(() => ({}))) as { code?: unknown; subtotal?: unknown };
    const code = String(body.code || "").trim().toUpperCase();
    const subtotal = Math.max(0, Number(body.subtotal) || 0);

    if (!code) {
      return NextResponse.json({ valid: false, error: "Please enter a promo code." }, { status: 400 });
    }

    const settings = await getCheckoutSettings();

    if (!settings.enablePromoCodes) {
      return NextResponse.json({ valid: false, error: "Promo code discounts are currently disabled." }, { status: 400 });
    }

    const promo = settings.promoCodes.find((p) => p.code.toUpperCase() === code);

    if (!promo || !promo.active) {
      return NextResponse.json({ valid: false, error: "Invalid or expired promo code." }, { status: 404 });
    }

    if (promo.minSpend && subtotal < promo.minSpend) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order amount of ৳${promo.minSpend.toLocaleString()} is required for code ${promo.code}.`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === "percentage") {
      discount = Math.round((subtotal * promo.value) / 100);
    } else {
      discount = Math.min(subtotal, promo.value);
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discount,
      minSpend: promo.minSpend || 0,
      description: promo.description || "",
      message:
        promo.type === "percentage"
          ? `${promo.value}% discount applied (-৳${discount.toLocaleString()})!`
          : `৳${discount.toLocaleString()} flat discount applied!`,
    });
  } catch (err) {
    console.error("Promo validation error:", err);
    return NextResponse.json({ valid: false, error: "Failed to validate promo code." }, { status: 500 });
  }
}
