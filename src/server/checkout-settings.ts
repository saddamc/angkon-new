import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

export const CHECKOUT_SETTINGS_KEY = "checkout";

export interface PromoCodeItem {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minSpend: number;
  active: boolean;
  description?: string;
}

export interface CheckoutSettings {
  requireEmailVerification: boolean;
  allowGuestCheckout: boolean;
  enablePromoCodes: boolean;
  promoCodes: PromoCodeItem[];
}

export const DEFAULT_PROMO_CODES: PromoCodeItem[] = [
  { code: "ANGKON10", type: "percentage", value: 10, minSpend: 0, active: true, description: "10% off for our patrons" },
  { code: "WELCOME", type: "fixed", value: 200, minSpend: 1500, active: true, description: "৳200 flat discount on orders over ৳1,500" },
  { code: "ROYAL20", type: "percentage", value: 20, minSpend: 3000, active: true, description: "20% off on luxury orders over ৳3,000" },
];

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  requireEmailVerification: true,
  allowGuestCheckout: true,
  enablePromoCodes: true,
  promoCodes: DEFAULT_PROMO_CODES,
};

export function normalizeCheckoutSettings(raw: unknown): CheckoutSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const requireEmailVerification =
    typeof source.requireEmailVerification === "boolean"
      ? source.requireEmailVerification
      : DEFAULT_CHECKOUT_SETTINGS.requireEmailVerification;

  const allowGuestCheckout =
    typeof source.allowGuestCheckout === "boolean"
      ? source.allowGuestCheckout
      : DEFAULT_CHECKOUT_SETTINGS.allowGuestCheckout;

  const enablePromoCodes =
    typeof source.enablePromoCodes === "boolean"
      ? source.enablePromoCodes
      : DEFAULT_CHECKOUT_SETTINGS.enablePromoCodes;

  const rawCodes = Array.isArray(source.promoCodes) ? source.promoCodes : DEFAULT_PROMO_CODES;
  const promoCodes: PromoCodeItem[] = rawCodes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      code: String(p?.code || "").trim().toUpperCase(),
      type: (p?.type === "fixed" ? "fixed" : "percentage") as "percentage" | "fixed",
      value: Math.max(0, Number(p?.value) || 0),
      minSpend: Math.max(0, Number(p?.minSpend) || 0),
      active: p?.active !== false,
      description: typeof p?.description === "string" ? p.description : "",
    }))
    .filter((p) => Boolean(p.code));

  return {
    requireEmailVerification,
    allowGuestCheckout,
    enablePromoCodes,
    promoCodes: Array.isArray(source.promoCodes) ? promoCodes : DEFAULT_PROMO_CODES,
  };
}

// High-speed In-Memory Checkout Settings Cache
let cachedCheckoutSettings: { data: CheckoutSettings; expiresAt: number } | null = null;
const CHECKOUT_SETTINGS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateCheckoutSettingsCache() {
  cachedCheckoutSettings = null;
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const now = Date.now();
  if (cachedCheckoutSettings && now < cachedCheckoutSettings.expiresAt) {
    return cachedCheckoutSettings.data;
  }

  try {
    await connectToDatabase();
    const doc = await Settings.findOne({ key: CHECKOUT_SETTINGS_KEY }).lean();
    const normalized = normalizeCheckoutSettings(doc?.value);
    cachedCheckoutSettings = { data: normalized, expiresAt: now + CHECKOUT_SETTINGS_CACHE_TTL_MS };
    return normalized;
  } catch (error) {
    if (cachedCheckoutSettings) return cachedCheckoutSettings.data;
    console.warn("Checkout settings unavailable, using defaults:", error);
    return { ...DEFAULT_CHECKOUT_SETTINGS };
  }
}
