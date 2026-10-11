import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { Product } from "@/models/Product";
import {
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
  parseProductFee,
  type ShippingItemRates,
  type ShippingSettings,
} from "@/lib/shipping";

export const SHIPPING_SETTINGS_KEY = "shipping";

/** The delivery settings saved in Admin → Settings → Shipping (defaults if none/unreachable). */
export async function getShippingSettings(): Promise<ShippingSettings> {
  try {
    await connectToDatabase();
    const doc = await Settings.findOne({ key: SHIPPING_SETTINGS_KEY }).lean();
    return normalizeShippingSettings(doc?.value);
  } catch (error) {
    console.warn("Shipping settings unavailable, using defaults:", error);
    return { ...DEFAULT_SHIPPING_SETTINGS };
  }
}

/**
 * Per-product delivery fees (`_delivery_inside` / `_delivery_outside`) keyed by product id.
 * Products without their own fee are simply absent from the result, so the store rate applies.
 */
export async function getProductDeliveryRates(productIds: number[]): Promise<Map<number, ShippingItemRates>> {
  const rates = new Map<number, ShippingItemRates>();
  const ids = [...new Set(productIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) return rates;

  try {
    await connectToDatabase();
    const docs = await Product.find({ id: { $in: ids } })
      .select("id meta_data")
      .lean();

    for (const doc of docs) {
      const meta = (doc.meta_data ?? []) as { key: string; value: unknown }[];
      // Last entry wins, matching how the admin form and storefront read these keys.
      const read = (key: string) => parseProductFee([...meta].reverse().find((m) => m.key === key)?.value);
      rates.set(doc.id as number, { inside: read("_delivery_inside"), outside: read("_delivery_outside") });
    }
  } catch (error) {
    console.warn("Product delivery fees unavailable, using store rates:", error);
  }
  return rates;
}
