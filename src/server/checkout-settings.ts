import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

export const CHECKOUT_SETTINGS_KEY = "checkout";

export interface CheckoutSettings {
  /**
   * When true (default), a customer must confirm their email with a one-time code
   * before an order is placed; they're signed in automatically afterwards.
   * Turn off in Admin → Settings → Checkout if email delivery is ever unavailable.
   */
  requireEmailVerification: boolean;
}

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = { requireEmailVerification: true };

export function normalizeCheckoutSettings(raw: unknown): CheckoutSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    requireEmailVerification:
      typeof source.requireEmailVerification === "boolean"
        ? source.requireEmailVerification
        : DEFAULT_CHECKOUT_SETTINGS.requireEmailVerification,
  };
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  try {
    await connectToDatabase();
    const doc = await Settings.findOne({ key: CHECKOUT_SETTINGS_KEY }).lean();
    return normalizeCheckoutSettings(doc?.value);
  } catch (error) {
    console.warn("Checkout settings unavailable, using defaults:", error);
    return { ...DEFAULT_CHECKOUT_SETTINGS };
  }
}
