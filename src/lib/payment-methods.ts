/**
 * Single source of truth for order payment-method channels.
 *
 * The checkout offers several SSLCOMMERZ gateway channels (bKash, Nagad,
 * cards, generic online) plus Cash on Delivery. Historically each layer
 * re-declared its own ad-hoc list — which is how "cards" orders ended up
 * rejected by the Order schema enum and mislabelled as COD in admin.
 * Every server route and UI surface must derive its decision from here.
 */

export const COD_PAYMENT_METHOD = "cod";

/** Every gateway channel the storefront can select at checkout. */
export const ONLINE_PAYMENT_METHODS = ["sslcommerz", "bkash", "nagad", "cards", "online"] as const;
export type OnlinePaymentMethod = (typeof ONLINE_PAYMENT_METHODS)[number];

export function normalizePaymentMethod(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/** True for any SSLCOMMERZ gateway channel (bKash/Nagad/card/online). */
export function isOnlinePaymentMethod(value: unknown): boolean {
  return (ONLINE_PAYMENT_METHODS as readonly string[]).includes(normalizePaymentMethod(value));
}

/** Customer-facing label used on invoices, emails, and order pages. */
export function getPaymentMethodLabel(value: unknown): string {
  switch (normalizePaymentMethod(value)) {
    case "cod":
      return "Cash on Delivery";
    case "bkash":
      return "bKash Online Payment";
    case "nagad":
      return "Nagad Online Payment";
    case "cards":
      return "Card Payment (SSLCOMMERZ)";
    case "online":
      return "Online Payment (SSLCOMMERZ)";
    case "sslcommerz":
      return "SSLCOMMERZ Online Gateway";
    default:
      return String(value || "").trim() || "Cash on Delivery";
  }
}

/** Compact badge label for admin tables. */
export function getPaymentMethodBadge(value: unknown): string {
  switch (normalizePaymentMethod(value)) {
    case "cod":
      return "COD";
    case "bkash":
      return "BKASH";
    case "nagad":
      return "NAGAD";
    case "cards":
      return "CARD";
    case "sslcommerz":
    case "online":
      return "SSLCOMMERZ";
    default:
      return "COD";
  }
}
