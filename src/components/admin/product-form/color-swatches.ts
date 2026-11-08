/**
 * Luxury & Fashion Apparel Color Dictionary & Normalizer
 * Provides accurate swatch mapping, perceptual redmean distance calculation,
 * synonym matching, and validation.
 */

export interface FashionColorItem {
  name: string;
  hex: string;
  isLight?: boolean;
  synonyms?: string[];
  category?: "Neutrals" | "Reds & Pinks" | "Blues" | "Greens" | "Earth & Warm" | "Purples" | "Metallics";
}

export const FASHION_COLOR_LIST: FashionColorItem[] = [
  // Neutrals & Darks
  { name: "Black", hex: "#000000", isLight: false, synonyms: ["kalo", "pitch black"], category: "Neutrals" },
  { name: "Jet Black", hex: "#171717", isLight: false, synonyms: ["deep black"], category: "Neutrals" },
  { name: "Charcoal", hex: "#334155", isLight: false, synonyms: ["dark grey", "anthracite"], category: "Neutrals" },
  { name: "Graphite", hex: "#374151", isLight: false, synonyms: ["slate"], category: "Neutrals" },
  { name: "Grey", hex: "#9ca3af", isLight: false, synonyms: ["gray", "ash"], category: "Neutrals" },
  { name: "Light Grey", hex: "#e5e7eb", isLight: true, synonyms: ["light gray", "silver grey"], category: "Neutrals" },
  { name: "Silver", hex: "#cbd5e1", isLight: true, synonyms: ["metallic silver", "rupalı"], category: "Neutrals" },
  { name: "White", hex: "#ffffff", isLight: true, synonyms: ["shada", "snow white"], category: "Neutrals" },
  { name: "Pure White", hex: "#ffffff", isLight: true, synonyms: ["stark white"], category: "Neutrals" },
  { name: "Off-White", hex: "#fafaf9", isLight: true, synonyms: ["milk white", "chalk"], category: "Neutrals" },
  { name: "Cream", hex: "#fffdd0", isLight: true, synonyms: ["malai", "buttercream"], category: "Neutrals" },
  { name: "Ivory", hex: "#fffff0", isLight: true, synonyms: ["pearl", "elephant tusk"], category: "Neutrals" },
  { name: "Beige", hex: "#f5f5dc", isLight: true, synonyms: ["biscuit", "khaki light"], category: "Neutrals" },
  { name: "Sand", hex: "#d8cbb8", isLight: true, synonyms: ["desert sand", "tan"], category: "Neutrals" },
  { name: "Nude", hex: "#e3bc9a", isLight: true, synonyms: ["skin", "flesh"], category: "Neutrals" },
  { name: "Khaki", hex: "#c3b091", isLight: true, synonyms: ["safari", "dust"], category: "Neutrals" },

  // Reds, Maroons & Pinks
  { name: "Maroon", hex: "#530911", isLight: false, synonyms: ["dark red", "merun", "lal"], category: "Reds & Pinks" },
  { name: "Deep Maroon", hex: "#2d0302", isLight: false, synonyms: ["blackish red"], category: "Reds & Pinks" },
  { name: "Burgundy", hex: "#800020", isLight: false, synonyms: ["wine red", "oxblood"], category: "Reds & Pinks" },
  { name: "Wine", hex: "#722f37", isLight: false, synonyms: ["vinous", "grape red"], category: "Reds & Pinks" },
  { name: "Dark Crimson", hex: "#4a0404", isLight: false, synonyms: ["crimson"], category: "Reds & Pinks" },
  { name: "Red", hex: "#dc2626", isLight: false, synonyms: ["lal", "chilli red", "bright red"], category: "Reds & Pinks" },
  { name: "Ruby Red", hex: "#9b111e", isLight: false, synonyms: ["ruby"], category: "Reds & Pinks" },
  { name: "Scarlet", hex: "#ff2400", isLight: false, synonyms: ["fiery red"], category: "Reds & Pinks" },
  { name: "Brick Red", hex: "#9b2c2c", isLight: false, synonyms: ["terracotta red"], category: "Reds & Pinks" },
  { name: "Coral", hex: "#fb7185", isLight: true, synonyms: ["coral pink", "living coral"], category: "Reds & Pinks" },
  { name: "Salmon", hex: "#fa8072", isLight: true, synonyms: ["salmon pink"], category: "Reds & Pinks" },
  { name: "Peach", hex: "#fed7aa", isLight: true, synonyms: ["apricot", "light orange"], category: "Reds & Pinks" },
  { name: "Dusty Rose", hex: "#d4a373", isLight: false, synonyms: ["old rose", "antique rose", "gulabi"], category: "Reds & Pinks" },
  { name: "Rose", hex: "#f43f5e", isLight: false, synonyms: ["rose pink"], category: "Reds & Pinks" },
  { name: "Blush Pink", hex: "#fbcfe8", isLight: true, synonyms: ["blush", "powder pink"], category: "Reds & Pinks" },
  { name: "Baby Pink", hex: "#fce7f3", isLight: true, synonyms: ["soft pink", "pastel pink"], category: "Reds & Pinks" },
  { name: "Pink", hex: "#ec4899", isLight: false, synonyms: ["gulabi", "standard pink"], category: "Reds & Pinks" },
  { name: "Hot Pink", hex: "#db2777", isLight: false, synonyms: ["rani pink", "electric pink"], category: "Reds & Pinks" },
  { name: "Magenta", hex: "#d946ef", isLight: false, synonyms: ["fuchsia pink"], category: "Reds & Pinks" },
  { name: "Fuchsia", hex: "#c026d3", isLight: false, synonyms: ["deep magenta"], category: "Reds & Pinks" },

  // Blues
  { name: "Navy Blue", hex: "#1e3a8a", isLight: false, synonyms: ["navy", "dark blue", "neel"], category: "Blues" },
  { name: "Midnight Blue", hex: "#0f172a", isLight: false, synonyms: ["deep navy"], category: "Blues" },
  { name: "Royal Blue", hex: "#1d4ed8", isLight: false, synonyms: ["king blue", "bright blue"], category: "Blues" },
  { name: "Blue", hex: "#2563eb", isLight: false, synonyms: ["neel", "standard blue"], category: "Blues" },
  { name: "Cobalt Blue", hex: "#0047ab", isLight: false, synonyms: ["cobalt"], category: "Blues" },
  { name: "Ocean Blue", hex: "#0284c7", isLight: false, synonyms: ["sea blue"], category: "Blues" },
  { name: "Steel Blue", hex: "#4682b4", isLight: false, synonyms: ["slate blue"], category: "Blues" },
  { name: "Sky Blue", hex: "#38bdf8", isLight: true, synonyms: ["akashi", "light blue", "cyan"], category: "Blues" },
  { name: "Baby Blue", hex: "#bae6fd", isLight: true, synonyms: ["pastel blue"], category: "Blues" },
  { name: "Powder Blue", hex: "#e0f2fe", isLight: true, synonyms: ["ice blue"], category: "Blues" },
  { name: "Teal", hex: "#0d9488", isLight: false, synonyms: ["dark cyan", "peacock"], category: "Blues" },
  { name: "Turquoise", hex: "#06b6d4", isLight: false, synonyms: ["firoza"], category: "Blues" },
  { name: "Aqua", hex: "#22d3ee", isLight: true, synonyms: ["water blue"], category: "Blues" },

  // Greens
  { name: "Bottle Green", hex: "#0d3b2e", isLight: false, synonyms: ["deep green", "kolaapata"], category: "Greens" },
  { name: "Emerald Green", hex: "#059669", isLight: false, synonyms: ["emerald", "panna", "shobuj"], category: "Greens" },
  { name: "Forest Green", hex: "#14532d", isLight: false, synonyms: ["hunter green"], category: "Greens" },
  { name: "Green", hex: "#16a34a", isLight: false, synonyms: ["shobuj", "standard green"], category: "Greens" },
  { name: "Olive Green", hex: "#65a30d", isLight: false, synonyms: ["olive", "mehendi"], category: "Greens" },
  { name: "Dark Olive", hex: "#3f6212", isLight: false, synonyms: ["army green"], category: "Greens" },
  { name: "Sage Green", hex: "#84a98c", isLight: true, synonyms: ["sage", "dusty green"], category: "Greens" },
  { name: "Mint Green", hex: "#a7f3d0", isLight: true, synonyms: ["mint", "pastel green"], category: "Greens" },
  { name: "Pistachio", hex: "#bef264", isLight: true, synonyms: ["pesta green", "pista"], category: "Greens" },
  { name: "Sea Green", hex: "#2e8b57", isLight: false, synonyms: ["marine green"], category: "Greens" },

  // Earth & Warm
  { name: "Coffee", hex: "#4a2c11", isLight: false, synonyms: ["espresso", "deep brown"], category: "Earth & Warm" },
  { name: "Chocolate Brown", hex: "#3b1d11", isLight: false, synonyms: ["chocolate"], category: "Earth & Warm" },
  { name: "Brown", hex: "#78350f", isLight: false, synonyms: ["khoyri", "brunette"], category: "Earth & Warm" },
  { name: "Yellow", hex: "#eab308", isLight: true, synonyms: ["holud", "bright yellow"], category: "Earth & Warm" },
  { name: "Mustard Yellow", hex: "#d4a017", isLight: false, synonyms: ["mustard", "shorshe"], category: "Earth & Warm" },
  { name: "Amber", hex: "#d97706", isLight: false, synonyms: ["golden orange"], category: "Earth & Warm" },
  { name: "Orange", hex: "#ea580c", isLight: false, synonyms: ["komola"], category: "Earth & Warm" },
  { name: "Rust", hex: "#b45309", isLight: false, synonyms: ["iron rust", "copper red"], category: "Earth & Warm" },
  { name: "Terracotta", hex: "#c2410c", isLight: false, synonyms: ["clay", "eet"], category: "Earth & Warm" },
  { name: "Caramel", hex: "#af593e", isLight: false, synonyms: ["toffee"], category: "Earth & Warm" },

  // Purples & Lilacs
  { name: "Purple", hex: "#9333ea", isLight: false, synonyms: ["beguni", "violet deep"], category: "Purples" },
  { name: "Deep Purple", hex: "#581c87", isLight: false, synonyms: ["royal purple"], category: "Purples" },
  { name: "Violet", hex: "#7c3aed", isLight: false, synonyms: ["jamrul"], category: "Purples" },
  { name: "Lavender", hex: "#e9d5ff", isLight: true, synonyms: ["light purple", "pastel violet"], category: "Purples" },
  { name: "Lilac", hex: "#c4b5fd", isLight: true, synonyms: ["pale purple"], category: "Purples" },
  { name: "Plum", hex: "#702459", isLight: false, synonyms: ["jamun"], category: "Purples" },
  { name: "Mauve", hex: "#906187", isLight: false, synonyms: ["dusty purple"], category: "Purples" },

  // Metallics & Luxury Accents
  { name: "Gold", hex: "#E1B76F", isLight: true, synonyms: ["golden", "shonali", "champagne gold"], category: "Metallics" },
  { name: "Antique Gold", hex: "#c5a059", isLight: false, synonyms: ["vintage gold"], category: "Metallics" },
  { name: "Champagne", hex: "#f7e7ce", isLight: true, synonyms: ["soft champagne"], category: "Metallics" },
  { name: "Rose Gold", hex: "#b76e79", isLight: false, synonyms: ["pink gold"], category: "Metallics" },
  { name: "Bronze", hex: "#cd7f32", isLight: false, synonyms: ["kasha"], category: "Metallics" },
  { name: "Copper", hex: "#b87333", isLight: false, synonyms: ["tamba"], category: "Metallics" },
];

// In-memory registry for user-created custom colors
const CUSTOM_COLOR_REGISTRY: Record<string, { hex: string; isLight: boolean }> = {};

export function registerCustomColor(name: string, hex: string): void {
  const clean = cleanColorName(name);
  if (!clean || !validateHexColor(hex)) return;
  const isLight = isHexColorLight(hex);
  CUSTOM_COLOR_REGISTRY[clean.toLowerCase()] = { hex: hex.toLowerCase(), isLight };
}

// Quick lookup dictionary by lowercase name
const COLOR_DICT: Record<string, FashionColorItem> = {};
for (const item of FASHION_COLOR_LIST) {
  COLOR_DICT[item.name.toLowerCase()] = item;
}

// Validate a user-entered color name
export function validateColorName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Color name is required" };
  }
  const clean = name.trim();
  if (clean.length === 0) {
    return { valid: false, error: "Color name cannot be empty" };
  }
  if (clean.length > 50) {
    return { valid: false, error: "Color name must be 50 characters or fewer" };
  }
  if (!/^[a-zA-Z0-9\s\-_/'&()]+$/.test(clean)) {
    return { valid: false, error: "Color name contains invalid characters" };
  }
  return { valid: true };
}

// Validate hexadecimal color code
export function validateHexColor(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((hex || "").trim());
}

function parseHexToRgb(hexStr: string): [number, number, number] {
  let clean = hexStr.replace(/^#/, "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function isHexColorLight(hexStr: string): boolean {
  const [r, g, b] = parseHexToRgb(hexStr);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.72;
}

function redmeanDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const rmean = (rgb1[0] + rgb2[0]) / 2;
  const r = rgb1[0] - rgb2[0];
  const g = rgb1[1] - rgb2[1];
  const b = rgb1[2] - rgb2[2];
  return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
}

/**
 * Maps any RGB or Hex code to the closest standard fashion color name.
 */
export function hexToNearestColorName(hex: string): { name: string; hex: string } {
  const clean = hex.trim();
  if (!clean) return { name: "Black", hex: "#000000" };

  for (const item of FASHION_COLOR_LIST) {
    if (item.hex.toLowerCase() === clean.toLowerCase()) {
      return { name: item.name, hex: item.hex };
    }
  }

  const targetRgb = parseHexToRgb(clean);
  let closestItem = FASHION_COLOR_LIST[0];
  let minDistance = Infinity;

  for (const item of FASHION_COLOR_LIST) {
    const itemRgb = parseHexToRgb(item.hex);
    const dist = redmeanDistance(targetRgb, itemRgb);
    if (dist < minDistance) {
      minDistance = dist;
      closestItem = item;
    }
  }

  return { name: closestItem.name, hex: closestItem.hex };
}

/**
 * Normalizes any color string to a clean, human-readable Color Name.
 * If given a hex code (e.g. #530911), converts to its closest color name (e.g. "Maroon").
 * If given words, formats in Title Case (e.g. "sage green" -> "Sage Green").
 */
export function cleanColorName(rawName: string): string {
  if (!rawName) return "";
  const trimmed = rawName.trim();
  if (!trimmed) return "";

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return hexToNearestColorName(trimmed).name;
  }

  const lower = trimmed.toLowerCase();
  if (COLOR_DICT[lower]) {
    return COLOR_DICT[lower].name;
  }

  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Formats a color for display in storefront UI, badges, and carts.
 * Always returns a friendly canonical color name, never an unformatted hex code.
 */
export function getColorDisplayName(colorStr: string | undefined | null): string {
  if (!colorStr) return "";
  const trimmed = colorStr.trim();
  if (!trimmed) return "";

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return hexToNearestColorName(trimmed).name;
  }

  return cleanColorName(trimmed);
}

/**
 * Resolves color styling (hex background, lightness, border classes) for swatches.
 * Handles custom colors, standard color names, and raw hexes.
 */
export function resolveColorStyle(name: string): {
  bg: string;
  isLight: boolean;
  borderClass: string;
  swatchBorder: string;
} {
  const clean = (name || "").trim().toLowerCase();

  // 1. Registered custom color
  if (CUSTOM_COLOR_REGISTRY[clean]) {
    const custom = CUSTOM_COLOR_REGISTRY[clean];
    return {
      bg: custom.hex,
      isLight: custom.isLight,
      borderClass: custom.isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
      swatchBorder: custom.isLight
        ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
        : "border border-black/30 shadow-2xs",
    };
  }

  // 2. Direct dictionary match
  if (COLOR_DICT[clean]) {
    const item = COLOR_DICT[clean];
    const isLight = !!item.isLight;
    return {
      bg: item.hex,
      isLight,
      borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
      swatchBorder: isLight
        ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
        : "border border-black/30 shadow-2xs",
    };
  }

  // 3. Raw hex format (#fff or #ffffff)
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) {
    let hex = clean.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const isLight = isHexColorLight("#" + hex);
    return {
      bg: clean,
      isLight,
      borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
      swatchBorder: isLight
        ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
        : "border border-black/30 shadow-2xs",
    };
  }

  // 4. Substring matching
  for (const item of FASHION_COLOR_LIST) {
    const itemNameLower = item.name.toLowerCase();
    if (clean.includes(itemNameLower) || itemNameLower.includes(clean)) {
      const isLight = !!item.isLight;
      return {
        bg: item.hex,
        isLight,
        borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
        swatchBorder: isLight
          ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
          : "border border-black/30 shadow-2xs",
      };
    }
  }

  const isLight =
    clean.includes("white") ||
    clean.includes("light") ||
    clean.includes("cream") ||
    clean.includes("beige") ||
    clean.includes("ivory") ||
    clean.includes("silver") ||
    clean.includes("gold") ||
    clean.includes("yellow");

  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean);

  return {
    bg: isHex ? clean : "#e7e5e4",
    isLight: isHex ? isLight : true,
    borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-stone-300",
    swatchBorder: isLight
      ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
      : "border border-stone-300 shadow-2xs",
  };
}

/**
 * Standard list of popular color options (deduplicated).
 */
export const COLOR_OPTIONS: string[] = Array.from(
  new Set(FASHION_COLOR_LIST.map((c) => c.name))
);

/**
 * Default initial colors shown when search is focused without text.
 */
export const DEFAULT_INITIAL_COLORS: string[] = [
  "Maroon",
  "Gold",
  "Black",
  "White",
  "Navy Blue",
];

export const POPULAR_SUGGESTIONS: string[] = [
  "Maroon",
  "Gold",
  "Black",
  "White",
  "Navy Blue",
];

/**
 * Searches fashion colors with synonym matching internally.
 * Returns up to `limit` matches (default 5).
 * Only canonical color items are returned.
 */
export function searchFashionColors(query: string, limit: number = 5): FashionColorItem[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) {
    return DEFAULT_INITIAL_COLORS
      .map((name) => COLOR_DICT[name.toLowerCase()])
      .filter((item): item is FashionColorItem => Boolean(item))
      .slice(0, limit);
  }

  const prefixMatches: FashionColorItem[] = [];
  const containsMatches: FashionColorItem[] = [];
  const synonymMatches: FashionColorItem[] = [];
  const seen = new Set<string>();

  for (const item of FASHION_COLOR_LIST) {
    const lowerName = item.name.toLowerCase();
    if (seen.has(lowerName)) continue;

    if (lowerName === q || lowerName.startsWith(q)) {
      prefixMatches.push(item);
      seen.add(lowerName);
    } else if (lowerName.includes(q)) {
      containsMatches.push(item);
      seen.add(lowerName);
    } else if (item.synonyms && item.synonyms.some((s) => s.toLowerCase().includes(q))) {
      synonymMatches.push(item);
      seen.add(lowerName);
    }
  }

  return [...prefixMatches, ...containsMatches, ...synonymMatches].slice(0, limit);
}

export const COLOR_CATEGORIES = [
  "All",
  "Neutrals",
  "Reds & Pinks",
  "Blues",
  "Greens",
  "Earth & Warm",
  "Purples",
  "Metallics",
] as const;
