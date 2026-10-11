import type { WooProduct } from "@/types/product";

const DEFAULT_INSIDE = 60;
const DEFAULT_OUTSIDE = 120;

function readMeta(meta: WooProduct["meta_data"], key: string): string | undefined {
  if (!meta?.length) return undefined;
  const hit = meta.slice().reverse().find((m) => m.key === key);
  return hit?.value != null ? String(hit.value) : undefined;
}

/** Per-product delivery fees from Woo meta (`_delivery_inside` / `_delivery_outside`).
 * Falls back to store defaults if not customized on the product.
 * Explicitly allows 0 for free delivery!
 */
export function getDeliveryFees(
  product: Pick<WooProduct, "meta_data">,
  storeDefaults?: { insideDhaka?: number; outsideDhaka?: number }
): {
  inside: number;
  outside: number;
  isCustom: boolean;
  isFree: boolean;
} {
  const fallbackInside = typeof storeDefaults?.insideDhaka === "number" ? storeDefaults.insideDhaka : DEFAULT_INSIDE;
  const fallbackOutside = typeof storeDefaults?.outsideDhaka === "number" ? storeDefaults.outsideDhaka : DEFAULT_OUTSIDE;

  const insideRaw = readMeta(product.meta_data, "_delivery_inside");
  const outsideRaw = readMeta(product.meta_data, "_delivery_outside");

  const hasCustomInside = insideRaw !== undefined && insideRaw.trim() !== "";
  const hasCustomOutside = outsideRaw !== undefined && outsideRaw.trim() !== "";

  const parsedInside = hasCustomInside ? parseInt(insideRaw.trim(), 10) : NaN;
  const parsedOutside = hasCustomOutside ? parseInt(outsideRaw.trim(), 10) : NaN;

  const inside = !isNaN(parsedInside) ? parsedInside : fallbackInside;
  const outside = !isNaN(parsedOutside) ? parsedOutside : fallbackOutside;

  return {
    inside,
    outside,
    isCustom: hasCustomInside || hasCustomOutside,
    isFree: inside === 0 && outside === 0,
  };
}

/** Color / Colour attribute options when present (simple products, not WC variations). */
export function getColorOptions(product: Pick<WooProduct, "attributes">): string[] {
  const attr = (product.attributes ?? []).find((a) => {
    const n = a.name?.toLowerCase() ?? "";
    return n === "color" || n === "colour";
  });
  return attr?.options?.filter(Boolean) ?? [];
}

const COLOR_SWATCH_MAP: Record<string, string> = {
  black: "#111827",
  white: "#f9fafb",
  red: "#dc2626",
  blue: "#2563eb",
  navy: "#1e3a5f",
  "navy blue": "#1e3a5f",
  green: "#16a34a",
  yellow: "#eab308",
  pink: "#ec4899",
  grey: "#9ca3af",
  gray: "#9ca3af",
  beige: "#d4c4a8",
  brown: "#92400e",
  purple: "#7c3aed",
  orange: "#ea580c",
  maroon: "#9f1239",
  olive: "#6b7280",
  "sky blue": "#38bdf8",
  skyblue: "#38bdf8",
  cream: "#fef3c7",
  gold: "#d4a017",
  silver: "#c0c0c0",
  teal: "#0d9488",
  cyan: "#06b6d4",
  magenta: "#d946ef",
  coral: "#fb7185",
  khaki: "#c3b091",
  ivory: "#fffff0",
  charcoal: "#36454f",
  wine: "#722f37",
  burgundy: "#800020",
  lavender: "#c4b5fd",
  mint: "#86efac",
  peach: "#fdba74",
  mustard: "#ca8a04",
  turquoise: "#2dd4bf",
  indigo: "#4f46e5",
  lime: "#84cc16",
  rose: "#f43f5e",
};

/** Resolve a color option name (or hex) to a CSS color for swatches. */
export function resolveColorSwatch(name: string): string {
  const raw = name.trim();
  if (!raw) return "#9ca3af";
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  if (/^rgb(a)?\(/i.test(raw)) return raw;
  const key = raw.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (COLOR_SWATCH_MAP[key]) return COLOR_SWATCH_MAP[key];
  const first = key.split(/\s+/)[0];
  if (COLOR_SWATCH_MAP[first]) return COLOR_SWATCH_MAP[first];
  return "#9ca3af";
}

/** Light colors need a border so the swatch stays visible on white. */
export function isLightColorSwatch(cssColor: string): boolean {
  const c = cssColor.toLowerCase();
  if (c === "#fff" || c === "#ffffff" || c === "#f9fafb" || c === "#fffff0" || c === "#fef3c7") {
    return true;
  }
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (!hex) return false;
  const n = parseInt(hex[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
}
