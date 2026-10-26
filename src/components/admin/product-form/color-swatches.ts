export function resolveColorStyle(name: string): {
  bg: string;
  isLight: boolean;
  borderClass: string;
  swatchBorder: string;
} {
  const clean = name.trim().toLowerCase();
  const map: Record<string, { bg: string; isLight?: boolean }> = {
    white: { bg: "#ffffff", isLight: true },
    "pure white": { bg: "#ffffff", isLight: true },
    "off-white": { bg: "#fafaf9", isLight: true },
    "off white": { bg: "#fafaf9", isLight: true },
    cream: { bg: "#fffdd0", isLight: true },
    ivory: { bg: "#fffff0", isLight: true },
    beige: { bg: "#f5f5dc", isLight: true },
    snow: { bg: "#fffafa", isLight: true },
    black: { bg: "#171717" },
    red: { bg: "#dc2626" },
    blue: { bg: "#2563eb" },
    navy: { bg: "#1e3a8a" },
    "navy blue": { bg: "#1e3a8a" },
    green: { bg: "#16a34a" },
    "emerald green": { bg: "#059669" },
    emerald: { bg: "#059669" },
    yellow: { bg: "#eab308", isLight: true },
    mustard: { bg: "#ca8a04" },
    pink: { bg: "#ec4899" },
    "baby pink": { bg: "#fbcfe8", isLight: true },
    "dusty rose": { bg: "#d4a373" },
    grey: { bg: "#9ca3af" },
    gray: { bg: "#9ca3af" },
    "light grey": { bg: "#e5e7eb", isLight: true },
    "light gray": { bg: "#e5e7eb", isLight: true },
    brown: { bg: "#78350f" },
    purple: { bg: "#9333ea" },
    orange: { bg: "#ea580c" },
    maroon: { bg: "#400604" },
    olive: { bg: "#65a30d" },
    "sky blue": { bg: "#38bdf8", isLight: true },
    gold: { bg: "#E1B76F", isLight: true },
    silver: { bg: "#cbd5e1", isLight: true },
    charcoal: { bg: "#334155" },
    teal: { bg: "#0d9488" },
    turquoise: { bg: "#06b6d4" },
    peach: { bg: "#fed7aa", isLight: true },
    lavender: { bg: "#e9d5ff", isLight: true },
    magenta: { bg: "#d946ef" },
    khaki: { bg: "#c3b091", isLight: true },
    burgundy: { bg: "#800020" },
    rust: { bg: "#b45309" },
  };

  if (map[clean]) {
    const isLight = !!map[clean].isLight;
    return {
      bg: map[clean].bg,
      isLight,
      borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
      swatchBorder: isLight
        ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
        : "border border-black/30 shadow-2xs",
    };
  }

  // Hex format #fff or #ffffff
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) {
    let hex = clean.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const isLight = lum > 0.72;
    return {
      bg: clean,
      isLight,
      borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
      swatchBorder: isLight
        ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
        : "border border-black/30 shadow-2xs",
    };
  }

  const isLight =
    clean.includes("white") ||
    clean.includes("light") ||
    clean.includes("cream") ||
    clean.includes("beige") ||
    clean.includes("ivory") ||
    clean.includes("snow") ||
    clean.includes("silver");

  return {
    bg: clean,
    isLight,
    borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-stone-300",
    swatchBorder: isLight
      ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
      : "border border-stone-300 shadow-2xs",
  };
}

export const COLOR_OPTIONS = [
  "Black",
  "White",
  "Off-White",
  "Cream",
  "Ivory",
  "Beige",
  "Maroon",
  "Red",
  "Navy",
  "Blue",
  "Sky Blue",
  "Emerald Green",
  "Green",
  "Olive",
  "Yellow",
  "Mustard",
  "Pink",
  "Baby Pink",
  "Peach",
  "Lavender",
  "Purple",
  "Gold",
  "Silver",
  "Rust",
  "Brown",
  "Burgundy",
  "Grey",
  "Teal",
];

export const POPULAR_SUGGESTIONS = [
  "White",
  "Off-White",
  "Cream",
  "Maroon",
  "Black",
  "Gold",
  "Navy",
  "Emerald Green",
];
