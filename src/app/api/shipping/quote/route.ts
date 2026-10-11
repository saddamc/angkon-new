import { NextRequest, NextResponse } from "next/server";
import { calculateShipping } from "@/lib/shipping";
import { getProductDeliveryRates, getShippingSettings } from "@/server/shipping";

const MAX_ITEMS = 100;

/**
 * POST /api/shipping/quote { district?: string, items: [{ productId, price, quantity }] }
 * Public and read-only. Uses exactly the same rule as order creation, so the
 * delivery fee a customer sees in the cart / checkout is the fee they are charged.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { district?: unknown; items?: unknown };
    const district = typeof body.district === "string" ? body.district.trim().slice(0, 80) : "";
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];

    const items = rawItems.map((item) => {
      const i = (item ?? {}) as Record<string, unknown>;
      const price = Number(i.price);
      const quantity = Math.max(1, Math.floor(Number(i.quantity)) || 1);
      return {
        productId: Number(i.productId) || 0,
        price: Number.isFinite(price) && price > 0 ? price : 0,
        quantity,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const [settings, rates] = await Promise.all([
      getShippingSettings(),
      getProductDeliveryRates(items.map((i) => i.productId)),
    ]);

    const quote = calculateShipping({
      subtotal,
      district,
      settings,
      itemRates: items.map((i) => rates.get(i.productId) ?? {}),
    });

    return NextResponse.json(
      { quote, subtotal },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch {
    return NextResponse.json({ error: "Could not calculate delivery." }, { status: 400 });
  }
}
