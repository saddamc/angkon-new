/**
 * Utilities for formatting payment amounts, dates, and card credentials for customer display.
 */

export function formatCurrency(amount: number, currency: string = "BDT"): string {
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return currency === "BDT" ? `৳${formatted}` : `${currency} ${formatted}`;
}

export function maskPaymentCard(cardNo?: string | null): string {
  if (!cardNo) return "N/A";
  const clean = cardNo.replace(/\s+/g, "");
  if (clean.length < 4) return clean;
  return `•••• •••• •••• ${clean.slice(-4)}`;
}

export function formatPaymentDate(date?: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function getProviderDisplayName(provider?: string): string {
  if (!provider) return "Online Payment";
  const map: Record<string, string> = {
    sslcommerz: "SSLCOMMERZ",
    bkash: "bKash",
    nagad: "Nagad",
    rocket: "Rocket",
    card: "Credit / Debit Card",
  };
  return map[provider.toLowerCase()] || provider.toUpperCase();
}
