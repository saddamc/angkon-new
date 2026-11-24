/**
 * ANGKON — Product Weight & Intelligent Courier Parcel Classification Engine
 *
 * Pure business logic for:
 * 1. Product unit weight normalization (g / kg -> kg).
 * 2. Automatic parcel weight calculation: sum(unitWeight * qty) + packaging allowance.
 * 3. Incomplete / missing weight detection.
 * 4. Automatic parcel category classification (Apparel, Accessories, Cosmetics, General).
 * 5. Mixed-category order detection.
 */

export type ShippingCategoryKey = "apparel" | "accessories" | "cosmetics" | "general";

export type DisplayParcelType =
  | "Fashion (Apparel)"
  | "Accessories"
  | "Cosmetics"
  | "General Parcel";

export interface PackagingPreset {
  id: string;
  name: string;
  weightKg: number;
  description: string;
}

export const PACKAGING_PRESETS: PackagingPreset[] = [
  {
    id: "poly_mailer",
    name: "Standard Poly Mailer",
    weightKg: 0.05,
    description: "Courier flyer bag (+0.05 kg / 50g)",
  },
  {
    id: "box_small",
    name: "Corrugated Box (Small)",
    weightKg: 0.15,
    description: "Small rigid box (+0.15 kg / 150g)",
  },
  {
    id: "box_medium",
    name: "Corrugated Box (Medium)",
    weightKg: 0.25,
    description: "Medium cardboard box (+0.25 kg / 250g)",
  },
  {
    id: "box_large",
    name: "Rigid Luxury Box",
    weightKg: 0.40,
    description: "Luxury apparel gift box (+0.40 kg / 400g)",
  },
  {
    id: "none",
    name: "No Extra Packaging",
    weightKg: 0.0,
    description: "Direct shipment (+0.00 kg)",
  },
];

export const DEFAULT_PACKAGING_ID = "poly_mailer";

export function getPackagingPreset(id?: string | null): PackagingPreset {
  const found = PACKAGING_PRESETS.find((p) => p.id === id);
  return found || PACKAGING_PRESETS[0];
}

/**
 * Normalizes any unit weight input into standard kilograms (kg).
 * Returns null if missing, zero, or unparsable.
 *
 * Weight represents ONE product unit.
 */
export function normalizeUnitWeightToKg(
  rawWeight: unknown,
  unit?: string | null
): number | null {
  if (rawWeight === null || rawWeight === undefined || rawWeight === "") {
    return null;
  }

  const num = typeof rawWeight === "number" ? rawWeight : parseFloat(String(rawWeight).trim());
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }

  const normalizedUnit = (unit || "").toLowerCase().trim();

  let weightInKg: number;
  if (normalizedUnit === "g" || normalizedUnit === "gram" || normalizedUnit === "grams") {
    weightInKg = num / 1000;
  } else if (normalizedUnit === "kg" || normalizedUnit === "kilogram" || normalizedUnit === "kilograms") {
    weightInKg = num;
  } else {
    // If unit is unspecified:
    // Values >= 25 are typically entered as grams (e.g. 250g, 450g, 1200g).
    // Values < 25 are typically entered as kilograms (e.g. 0.35kg, 1.2kg, 2.5kg).
    if (num >= 25) {
      weightInKg = num / 1000;
    } else {
      weightInKg = num;
    }
  }

  // Round to 3 decimal places (e.g. 0.350 kg)
  return Math.round(weightInKg * 1000) / 1000;
}

const APPAREL_REGEX =
  /\b(apparel|clothing|dress|suit|shirt|polo|hoodie|tee|t-shirt|panjabi|kurti|salwar|kameez|saree|sari|garara|lehenga|dastaan|tawakkal|aiman|guzel|safa marwa|shawl|fabric|lawn|cotton|silk|chiffon|georgette|linen|organza|top|pants|trousers|dupatta|unstitched)\b/i;

const ACCESSORIES_REGEX =
  /\b(accessories|accessory|bag|bags|handbag|purse|wallet|jewelry|jewellery|necklace|earrings|ring|bracelet|bangle|belt|sunglasses|scarf|brooch|pin|watch|clutch|pouch|hairband)\b/i;

const COSMETICS_REGEX =
  /\b(cosmetics|skincare|skin care|makeup|beauty|lotion|cream|serum|perfume|fragrance|attar|oil|soap|cleanser|shampoo|lipstick|lip|powder|mask|toner|facial|sunscreen)\b/i;

/**
 * Classifies an individual product into one of the 4 core shipping categories.
 */
export function classifyProductCategory(input: {
  name?: string;
  categoryNames?: string[];
  explicitCategory?: string | null;
}): ShippingCategoryKey {
  // 1. Explicit override on Product document
  if (input.explicitCategory) {
    const explicit = input.explicitCategory.toLowerCase().trim();
    if (explicit === "apparel" || explicit.includes("apparel") || explicit.includes("fashion")) {
      return "apparel";
    }
    if (explicit === "accessories" || explicit.includes("accessor")) {
      return "accessories";
    }
    if (explicit === "cosmetics" || explicit.includes("cosmetic") || explicit.includes("skin")) {
      return "cosmetics";
    }
    if (explicit === "general") {
      return "general";
    }
  }

  // 2. Inspect category names and product name
  const combinedText = [
    input.name || "",
    ...(input.categoryNames || []),
  ].join(" ").toLowerCase();

  // Specific priority check: Accessories & Cosmetics have distinct keywords
  if (ACCESSORIES_REGEX.test(combinedText)) {
    return "accessories";
  }
  if (COSMETICS_REGEX.test(combinedText)) {
    return "cosmetics";
  }
  if (APPAREL_REGEX.test(combinedText)) {
    return "apparel";
  }

  // Default fallback for unknown items
  return "general";
}

/**
 * Converts internal category key to UI Display Parcel Type string.
 */
export function categoryToDisplayParcelType(key: ShippingCategoryKey): DisplayParcelType {
  switch (key) {
    case "apparel":
      return "Fashion (Apparel)";
    case "accessories":
      return "Accessories";
    case "cosmetics":
      return "Cosmetics";
    case "general":
    default:
      return "General Parcel";
  }
}

/**
 * Converts UI Display Parcel Type string back to internal category key.
 */
export function displayParcelTypeToCategory(display: string): ShippingCategoryKey {
  const norm = display.toLowerCase();
  if (norm.includes("apparel") || norm.includes("fashion")) return "apparel";
  if (norm.includes("accessories")) return "accessories";
  if (norm.includes("cosmetics")) return "cosmetics";
  return "general";
}

export interface ParcelClassificationResult {
  parcelType: DisplayParcelType;
  isMixed: boolean;
  primaryCategory: ShippingCategoryKey;
  categoryBreakdown: Record<ShippingCategoryKey, number>;
}

/**
 * Automatically classifies an entire order based on its line items:
 * - All Apparel -> Fashion (Apparel)
 * - All Accessories -> Accessories
 * - All Cosmetics -> Cosmetics
 * - Mixed or Unknown -> General Parcel
 */
export function classifyOrderParcel(
  itemCategories: ShippingCategoryKey[]
): ParcelClassificationResult {
  const breakdown: Record<ShippingCategoryKey, number> = {
    apparel: 0,
    accessories: 0,
    cosmetics: 0,
    general: 0,
  };

  for (const cat of itemCategories) {
    breakdown[cat] = (breakdown[cat] || 0) + 1;
  }

  const presentCategories = (Object.keys(breakdown) as ShippingCategoryKey[]).filter(
    (k) => breakdown[k] > 0
  );

  // If order contains items from more than one category -> General Parcel (Mixed)
  if (presentCategories.length > 1) {
    return {
      parcelType: "General Parcel",
      isMixed: true,
      primaryCategory: "general",
      categoryBreakdown: breakdown,
    };
  }

  // Exactly one category
  if (presentCategories.length === 1) {
    const singleCat = presentCategories[0];
    return {
      parcelType: categoryToDisplayParcelType(singleCat),
      isMixed: false,
      primaryCategory: singleCat,
      categoryBreakdown: breakdown,
    };
  }

  // Empty items fallback
  return {
    parcelType: "General Parcel",
    isMixed: false,
    primaryCategory: "general",
    categoryBreakdown: breakdown,
  };
}

export interface OrderItemForWeight {
  productId: number;
  name: string;
  quantity: number;
  weight?: unknown;
  weightUnit?: string | null;
  shippingCategory?: string | null;
  categories?: Array<{ name: string; slug?: string }>;
}

export interface OrderItemWeightCalculation {
  productId: number;
  name: string;
  quantity: number;
  unitWeightKg: number | null;
  totalWeightKg: number | null;
  isMissingWeight: boolean;
  shippingCategory: ShippingCategoryKey;
}

export interface OrderParcelWeightSummary {
  items: OrderItemWeightCalculation[];
  totalProductWeightKg: number;
  packagingId: string;
  packagingName: string;
  packagingWeightKg: number;
  finalPackageWeightKg: number;
  hasMissingWeight: boolean;
  isZeroWeight: boolean;
  missingProductCount: number;
  missingProducts: Array<{ productId: number; name: string; quantity: number }>;
  autoParcelType: DisplayParcelType;
  isMixedCategory: boolean;
  categoryBreakdown: Record<ShippingCategoryKey, number>;
  totalQuantity: number;
  itemDescription: string;
}

/**
 * Calculates complete parcel weight and auto-classification for an order:
 * sum(product.unitWeight * quantity) + packaging weight.
 *
 * If any product has no configured weight:
 * - Does NOT silently assume 0.5 kg.
 * - Flags hasMissingWeight = true and lists missing products.
 */
export function calculateOrderParcelWeight(
  items: OrderItemForWeight[],
  packagingId: string = DEFAULT_PACKAGING_ID
): OrderParcelWeightSummary {
  const packaging = getPackagingPreset(packagingId);
  const calculatedItems: OrderItemWeightCalculation[] = [];
  const missingProducts: Array<{ productId: number; name: string; quantity: number }> = [];
  const categoriesList: ShippingCategoryKey[] = [];

  let totalProductWeightKg = 0;
  let totalQuantity = 0;

  for (const it of items) {
    const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
    totalQuantity += qty;

    const unitKg = normalizeUnitWeightToKg(it.weight, it.weightUnit);
    const categoryNames = (it.categories || []).map((c) => c.name);
    const category = classifyProductCategory({
      name: it.name,
      categoryNames,
      explicitCategory: it.shippingCategory,
    });

    categoriesList.push(category);

    if (unitKg === null) {
      calculatedItems.push({
        productId: it.productId,
        name: it.name,
        quantity: qty,
        unitWeightKg: null,
        totalWeightKg: null,
        isMissingWeight: true,
        shippingCategory: category,
      });
      missingProducts.push({
        productId: it.productId,
        name: it.name,
        quantity: qty,
      });
    } else {
      const lineWeight = Math.round(unitKg * qty * 1000) / 1000;
      totalProductWeightKg += lineWeight;
      calculatedItems.push({
        productId: it.productId,
        name: it.name,
        quantity: qty,
        unitWeightKg: unitKg,
        totalWeightKg: lineWeight,
        isMissingWeight: false,
        shippingCategory: category,
      });
    }
  }

  totalProductWeightKg = Math.round(totalProductWeightKg * 1000) / 1000;
  const hasMissingWeight = missingProducts.length > 0;

  // Final package weight = total product weight + packaging weight
  // Rounded to 2 decimal places for courier booking
  // Strict mathematical equality: Product Weight + Packaging Allowance = Final Package Weight
  const rawFinalWeight = totalProductWeightKg + packaging.weightKg;
  const finalPackageWeightKg = Math.round(rawFinalWeight * 100) / 100;
  const isZeroWeight = finalPackageWeightKg <= 0;

  const classification = classifyOrderParcel(categoriesList);

  // Generate clean item description for Steadfast / Courier
  const itemDescription = `${classification.parcelType} (${totalQuantity} item${
    totalQuantity > 1 ? "s" : ""
  })`;

  return {
    items: calculatedItems,
    totalProductWeightKg,
    packagingId: packaging.id,
    packagingName: packaging.name,
    packagingWeightKg: packaging.weightKg,
    finalPackageWeightKg,
    hasMissingWeight,
    isZeroWeight,
    missingProductCount: missingProducts.length,
    missingProducts,
    autoParcelType: classification.parcelType,
    isMixedCategory: classification.isMixed,
    categoryBreakdown: classification.categoryBreakdown,
    totalQuantity,
    itemDescription,
  };
}
