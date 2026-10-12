/**
 * Single source of truth for delivery pricing.
 * Pure functions only — safe to import from the browser and from the server,
 * so the price a customer sees is always the price the order is charged.
 *
 * Rules (all configurable in Admin → Settings → Shipping):
 *  1. The zone comes from the district: Dhaka → "inside", everywhere else → "outside".
 *  2. Each item costs the store rate for that zone, unless the product has its own
 *     delivery fee for the zone (a product fee of 0 means that product ships free).
 *  3. An order pays one delivery charge: the highest fee among its items.
 *  4. If a free-delivery threshold is set (> 0) and the subtotal reaches it, delivery is free.
 */

export interface ShippingSettings {
  /** Delivery fee when the district is Dhaka (৳) */
  insideDhaka: number;
  /** Delivery fee for every other district (৳) */
  outsideDhaka: number;
  /** Subtotal at or above which delivery is free (৳). 0 = never free by threshold. */
  freeDeliveryThreshold: number;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  insideDhaka: 60,
  outsideDhaka: 120,
  freeDeliveryThreshold: 1500,
};

export type ShippingZone = "inside" | "outside";

/** Per-product delivery fees. `null`/`undefined` = use the store rate. */
export interface ShippingItemRates {
  inside?: number | null;
  outside?: number | null;
}

export interface ShippingQuote {
  /** Delivery fee to charge (৳) */
  fee: number;
  zone: ShippingZone;
  /** True when the district was actually given (false = estimate using the inside-Dhaka rate) */
  zoneKnown: boolean;
  /** True when the fee is 0 for any reason */
  isFree: boolean;
  /** True when the fee is 0 because the subtotal reached the free-delivery threshold */
  freeByThreshold: boolean;
  /** The configured threshold (0 = off) */
  freeDeliveryThreshold: number;
  /** How much more to spend to unlock free delivery, or null when not applicable */
  amountToFreeDelivery: number | null;
}

/** Coerce anything (DB document, request body, API response) into valid settings. */
export function normalizeShippingSettings(raw: unknown): ShippingSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const read = (value: unknown, fallback: number) => {
    const n = typeof value === "string" ? Number(value.trim()) : Number(value);
    return value !== undefined && value !== null && value !== "" && Number.isFinite(n) && n >= 0
      ? Math.round(n)
      : fallback;
  };
  return {
    insideDhaka: read(source.insideDhaka, DEFAULT_SHIPPING_SETTINGS.insideDhaka),
    outsideDhaka: read(source.outsideDhaka, DEFAULT_SHIPPING_SETTINGS.outsideDhaka),
    freeDeliveryThreshold: read(source.freeDeliveryThreshold, DEFAULT_SHIPPING_SETTINGS.freeDeliveryThreshold),
  };
}

/** Dhaka (and "Dhaka City") is the inside zone; any other district is outside. */
export function isInsideDhaka(district?: string | null): boolean {
  const d = (district ?? "").trim().toLowerCase();
  return d === "dhaka" || d === "dhaka city";
}

/** Parse a stored per-product fee ("60", 60, "", null) → number, or null for "use store rate". */
export function parseProductFee(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function calculateShipping(input: {
  subtotal: number;
  /** Customer's district. Empty/undefined → estimate with the inside-Dhaka rate. */
  district?: string | null;
  settings: ShippingSettings;
  /** One entry per cart line (or per distinct product). */
  itemRates?: ShippingItemRates[];
}): ShippingQuote {
  const { settings } = input;
  const subtotal = Number.isFinite(input.subtotal) ? Math.max(0, input.subtotal) : 0;
  const zoneKnown = Boolean((input.district ?? "").trim());
  const zone: ShippingZone = !zoneKnown || isInsideDhaka(input.district) ? "inside" : "outside";
  const storeRate = zone === "inside" ? settings.insideDhaka : settings.outsideDhaka;

  const rates = input.itemRates ?? [];
  const perItem = rates.map((r) => {
    const own = zone === "inside" ? r.inside : r.outside;
    return own === null || own === undefined ? storeRate : own;
  });
  const baseFee = perItem.length ? Math.max(...perItem) : storeRate;

  const threshold = settings.freeDeliveryThreshold;
  const freeByThreshold = threshold > 0 && subtotal >= threshold && baseFee > 0;
  const fee = freeByThreshold ? 0 : baseFee;

  return {
    fee,
    zone,
    zoneKnown,
    isFree: fee === 0,
    freeByThreshold,
    freeDeliveryThreshold: threshold,
    amountToFreeDelivery: threshold > 0 && subtotal < threshold && baseFee > 0 ? threshold - subtotal : null,
  };
}
