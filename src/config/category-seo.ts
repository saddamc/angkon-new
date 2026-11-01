export interface CategorySeoConfig {
  title: string;
  description: string;
  h1: string;
}

/**
 * Centrally defined, customer-intent-focused SEO metadata for ANGKON categories.
 * Conforms to approved Bangladesh search-intent guidelines:
 * - Specific commercial & search-intent targeting for Bangladesh market
 * - Natural language without keyword stuffing
 * - Factual mentions of Pakistani designer collections where verified
 * - Meta descriptions strictly within 60 - 170 characters for Google SERP presentation
 */
export const CATEGORY_SEO_MAP: Record<string, CategorySeoConfig> = {
  women: {
    title: "Women's Dresses Online in Bangladesh | ANGKON",
    h1: "Women's Dresses & Designer Ethnic Fashion",
    description:
      "Shop women's dresses online in Bangladesh at ANGKON. Discover premium three-piece suits, embroidered outfits, and festive ethnic wear with nationwide Cash on Delivery.",
  },
  "ethnic-wear": {
    title: "Three-Piece Dresses & Embroidered Suits for Women | ANGKON",
    h1: "Designer Three-Piece Dresses & Embroidered Suits",
    description:
      "Shop designer three-piece dresses and embroidered suits for women at ANGKON. Curated festive wear featuring Pakistani designer collections with nationwide COD.",
  },
  "tawakkal-wada": {
    title: "Tawakkal Wada Collection — Luxury 3-Piece Embroidered Suits | ANGKON",
    h1: "Tawakkal Wada Luxury 3-Piece Embroidered Suits",
    description:
      "Shop the Tawakkal Wada 3-piece collection in Bangladesh. Features premium embroidered long kameez, printed trousers, and coordinated gradient dupattas.",
  },
  guzel: {
    title: "Güzel Dastaan Designer Embroidered Suits | ANGKON",
    h1: "Güzel Dastaan Luxury Embroidered Suits",
    description:
      "Discover the Güzel Dastaan collection at ANGKON: luxury embroidered 3-piece suits featuring intricate zari needlework, pearl embellishments, and designer borders.",
  },
  "aiman-aisha": {
    title: "Aiman Aisha Festive Embroidered Suits & Gararas | ANGKON",
    h1: "Aiman Aisha Festive Embroidered Suits & Gararas",
    description:
      "Shop Aiman Aisha luxury festive collections at ANGKON. Exquisite pastel floral embroidery, pearl detailing, and statement garara silhouettes with nationwide COD.",
  },
  "safa-marwa": {
    title: "Safa-Marwa Luxury Embroidered 3-Piece Suits | ANGKON",
    h1: "Safa-Marwa Luxury Embroidered 3-Piece Suits",
    description:
      "Explore Safa-Marwa designer embroidered 3-piece suits at ANGKON. Featuring intricate floral threadwork and luxury coordinated dupattas with nationwide Cash on Delivery.",
  },
  men: {
    title: "Men's Fashion & Heritage Apparel in Bangladesh | ANGKON",
    h1: "Men's Apparel & Heritage Collection",
    description:
      "Explore men's clothing at ANGKON. Contemporary styles and heritage apparel crafted with premium textiles. New seasonal collections coming soon.",
  },
  accessories: {
    title: "Fashion Accessories in Bangladesh | ANGKON",
    h1: "Fashion Accessories Collection",
    description:
      "Explore fashion accessories at ANGKON. Handcrafted accessories, jewelry, and style essentials. New arrivals coming soon.",
  },
};

/**
 * Resolves category SEO metadata with fallback for unmapped custom categories.
 */
export function getCategorySeo(slug: string, fallbackName?: string): CategorySeoConfig {
  const normalized = (slug || "").toLowerCase().trim();
  if (CATEGORY_SEO_MAP[normalized]) {
    return CATEGORY_SEO_MAP[normalized];
  }
  for (const [key, value] of Object.entries(CATEGORY_SEO_MAP)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  const name = fallbackName || slug;
  return {
    title: `${name} | ANGKON`,
    h1: name,
    description: `Shop ${name} at ANGKON. Premium fashion in Bangladesh with Cash on Delivery across all 64 districts.`,
  };
}
