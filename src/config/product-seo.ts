import type { WooProduct } from "@/types/product";

export interface ProductSeoEntry {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  targetKeywords: string[];
  imageAlt: string;
}

/**
 * Verified customer-intent SEO configuration for all 16 published ANGKON catalog products.
 * Prioritizes: Women's three-piece suits, embroidered dresses, colors, silhouettes,
 * and collection names without over-relying on "Pakistani" as the sole primary keyword.
 */
export const PRODUCT_SEO_CATALOG: Record<string, ProductSeoEntry> = {
  // ── Tawakkal Wada Collection (BDT 7,990) ──
  "tawakkal-wada-midnight-black": {
    slug: "tawakkal-wada-midnight-black",
    seoTitle: "Midnight Black Floral Embroidered 3-Piece Suit — Tawakkal Wada | ANGKON",
    seoDescription:
      "Shop the Tawakkal Wada Midnight Black 3-piece suit. Features delicate floral embroidery, monochrome wide-leg trousers, and a gradient dupatta. ৳7,990 with COD.",
    h1: "Tawakkal Wada – Midnight Black 3-Piece Embroidered Suit",
    targetKeywords: [
      "black floral embroidered suit bd",
      "midnight black three piece dress",
      "tawakkal wada black suit",
      "black party wear dress for women",
    ],
    imageAlt:
      "Tawakkal Wada Midnight Black 3-piece embroidered suit with monochrome printed trouser and smoky grey gradient dupatta",
  },
  "tawakkal-wada-deep-emerald-green": {
    slug: "tawakkal-wada-deep-emerald-green",
    seoTitle: "Deep Emerald Green Embroidered 3-Piece Suit — Tawakkal Wada | ANGKON",
    seoDescription:
      "Elegance in green: Tawakkal Wada Deep Emerald Green 3-piece suit with intricate embroidery, printed wide-leg trousers, and mist grey dupatta. ৳7,990 in BD.",
    h1: "Tawakkal Wada – Deep Emerald Green 3-Piece Embroidered Suit",
    targetKeywords: [
      "emerald green three piece suit",
      "green embroidered dress for women",
      "tawakkal emerald green suit bd",
      "festive green 3 piece dress",
    ],
    imageAlt:
      "Deep emerald green embroidered kameez with mist grey coordinated dupatta and printed trousers",
  },
  "tawakkal-wada-dark-coffee-brown": {
    slug: "tawakkal-wada-dark-coffee-brown",
    seoTitle: "Dark Coffee Brown & Dusty Rose 3-Piece Suit — Tawakkal Wada | ANGKON",
    seoDescription:
      "Discover the Tawakkal Wada Dark Coffee Brown 3-piece dress with dusty rose accents, embroidered long kameez, and coordinated dupatta. ৳7,990 with COD in BD.",
    h1: "Tawakkal Wada – Dark Coffee Brown 3-Piece Embroidered Suit",
    targetKeywords: [
      "brown embroidered three piece",
      "coffee brown dress for women",
      "tawakkal wada brown suit",
      "earth tone ethnic wear bangladesh",
    ],
    imageAlt:
      "Tawakkal Wada dark coffee brown embroidered ethnic suit with dusty rose accents",
  },
  "tawakkal-wada-royal-navy-blue": {
    slug: "tawakkal-wada-royal-navy-blue",
    seoTitle: "Royal Navy Blue Floral Embroidered 3-Piece Suit — Tawakkal Wada | ANGKON",
    seoDescription:
      "Royal Navy Blue 3-piece ensemble from Tawakkal Wada featuring powder blue accents, embroidered neckline, and flowing dupatta. ৳7,990 with COD nationwide.",
    h1: "Tawakkal Wada – Royal Navy Blue 3-Piece Embroidered Suit",
    targetKeywords: [
      "navy blue three piece dress",
      "royal blue embroidered suit bd",
      "tawakkal navy blue 3 piece",
      "women party wear navy blue suit",
    ],
    imageAlt:
      "Royal navy blue long kameez with powder blue floral embroidery and printed wide-leg trousers",
  },
  "tawakkal-wada-deep-plum-purple": {
    slug: "tawakkal-wada-deep-plum-purple",
    seoTitle: "Deep Plum Purple Festive 3-Piece Embroidered Suit — Tawakkal Wada | ANGKON",
    seoDescription:
      "Tawakkal Wada Deep Plum Purple 3-piece suit with silver-grey floral motifs, statement printed trousers, and luxury dupatta. BDT 7,990. Fast delivery in BD.",
    h1: "Tawakkal Wada – Deep Plum Purple 3-Piece Embroidered Suit",
    targetKeywords: [
      "purple three piece dress bd",
      "deep plum embroidered suit",
      "tawakkal plum purple suit",
      "festive wear purple dress",
    ],
    imageAlt:
      "Deep plum purple 3-piece embroidered suit with silver grey floral needlework and ombre dupatta",
  },
  "tawakkal-wada-deep-teal-blue": {
    slug: "tawakkal-wada-deep-teal-blue",
    seoTitle: "Deep Teal Blue 3-Piece Embroidered Ensemble — Tawakkal Wada | ANGKON",
    seoDescription:
      "Shop Tawakkal Wada Deep Teal Blue 3-piece suit. Detailed embroidery with aqua blue motifs, wide-leg printed trousers, and luxury dupatta. ৳7,990 with COD.",
    h1: "Tawakkal Wada – Deep Teal Blue 3-Piece Embroidered Suit",
    targetKeywords: [
      "teal blue three piece dress",
      "teal embroidered suit for women bd",
      "tawakkal teal blue 3 piece",
      "semi formal ethnic dress",
    ],
    imageAlt:
      "Deep teal blue embroidered long kameez with aqua accents and matching printed trouser",
  },
  "tawakkal-wada-deep-raspberry-magenta": {
    slug: "tawakkal-wada-deep-raspberry-magenta",
    seoTitle: "Deep Raspberry Magenta 3-Piece Embroidered Suit — Tawakkal Wada | ANGKON",
    seoDescription:
      "Vibrant Raspberry Magenta 3-piece suit from Tawakkal Wada. Soft ivory embroidery, tailored monochrome trousers, and luxury printed dupatta. ৳7,990 in BD.",
    h1: "Tawakkal Wada – Deep Raspberry Magenta 3-Piece Embroidered Suit",
    targetKeywords: [
      "magenta three piece dress bd",
      "raspberry pink embroidered suit",
      "tawakkal magenta 3 piece",
      "wedding guest dress bangladesh",
    ],
    imageAlt:
      "Deep raspberry magenta 3-piece suit with soft ivory floral embroidery and coordinated dupatta",
  },

  // ── Güzel Dastaan Collection (BDT 8,800) ──
  "safaidah-dastaan-black-floral-suit": {
    slug: "safaidah-dastaan-black-floral-suit",
    seoTitle: "Safaidah Black Floral Embroidered 3-Piece Suit — Güzel Dastaan | ANGKON",
    seoDescription:
      "Safaidah from the Güzel Dastaan collection: Black 3-piece dress with teal-blue floral embroidery, embellished neckline, and lace border trouser. ৳8,800 in BD.",
    h1: "Safaidah – Dastaan | Black Floral Embroidered 3-Piece Suit",
    targetKeywords: [
      "black floral embroidered suit",
      "guzel dastaan safaidah",
      "black three piece party wear bd",
      "designer black salwar kameez",
    ],
    imageAlt:
      "Safaidah by Güzel black floral embroidered 3-piece suit with teal-blue neckline accents and lace detailing",
  },
  "gulnaar-dastaan-blush-pink-embroidered-suit": {
    slug: "gulnaar-dastaan-blush-pink-embroidered-suit",
    seoTitle: "Gulnaar Blush Pink Pearl Embroidered 3-Piece Suit — Güzel Dastaan | ANGKON",
    seoDescription:
      "Gulnaar by Güzel Dastaan: Exquisite blush pink 3-piece suit with silver-gold zari embroidery, pearl embellishments, and luxury dupatta. BDT 8,800 with COD.",
    h1: "Gulnaar – Dastaan | Blush Pink Embroidered 3-Piece Suit",
    targetKeywords: [
      "blush pink embroidered three piece",
      "guzel gulnaar dress bd",
      "pearl embellished suit for women",
      "wedding guest blush pink dress",
    ],
    imageAlt:
      "Gulnaar blush pink embroidered 3-piece suit with delicate silver-gold zari needlework and pearl accents",
  },
  "shabnam-dastaan-icy-blue-embroidered-suit": {
    slug: "shabnam-dastaan-icy-blue-embroidered-suit",
    seoTitle: "Shabnam Icy Blue Zari Embroidered 3-Piece Suit — Güzel Dastaan | ANGKON",
    seoDescription:
      "Shabnam by Güzel: Icy blue 3-piece embroidered suit featuring intricate silver-gold embroidery, pearl details, and ornate lace borders. ৳8,800 in BD.",
    h1: "Shabnam – Dastaan | Icy Blue Embroidered 3-Piece Suit",
    targetKeywords: [
      "icy blue three piece dress",
      "guzel shabnam suit bd",
      "pastel blue embroidered suit",
      "luxury party wear dress bd",
    ],
    imageAlt:
      "Shabnam icy blue 3-piece luxury suit with delicate silver floral embroidery and decorative lace finish",
  },
  "ivory-and-teal-guzel-embroidered-suit": {
    slug: "ivory-and-teal-guzel-embroidered-suit",
    seoTitle: "Ivory & Teal Floral Lace Embroidered 3-Piece Suit — Güzel | ANGKON",
    seoDescription:
      "Ivory and teal-blue luxury 3-piece suit by Güzel. Elaborate gold floral embroidery, pearl embellishments, and scalloped lace borders. ৳8,800 with nationwide COD.",
    h1: "Ivory & Teal – Luxury Embroidered 3-Piece Suit by Güzel",
    targetKeywords: [
      "ivory three piece dress for women",
      "teal and ivory embroidered suit",
      "guzel luxury three piece",
      "formal ethnic dress dhaka",
    ],
    imageAlt:
      "Ivory and teal-blue embroidered kameez with intricate gold threadwork and delicate pearl detailing",
  },

  // ── Aiman Aisha Collection (BDT 8,800) ──
  "soiree-d4-dusty-rose-embroidered-suit": {
    slug: "soiree-d4-dusty-rose-embroidered-suit",
    seoTitle: "Soiree D4 Dusty Rose Pearl Embroidered 3-Piece Suit — Aiman | ANGKON",
    seoDescription:
      "Soiree D4 by Aiman: Dusty rose 3-piece dress with silver-gold floral motifs, pearl accents, decorative button detailing, and matching dupatta. ৳8,800 in BD.",
    h1: "Soiree D4 – Dusty Rose Embroidered 3-Piece Suit by Aiman",
    targetKeywords: [
      "dusty rose three piece dress",
      "aiman aisha soiree d4",
      "rose embroidered suit bd",
      "women party wear ethnic dress",
    ],
    imageAlt:
      "Soiree D4 dusty rose embroidered 3-piece suit with pearl buttons and silver-gold botanical motifs",
  },
  "alita-garara-lavender-embroidered-suit": {
    slug: "alita-garara-lavender-embroidered-suit",
    seoTitle: "Alita Lavender Garara Embroidered 3-Piece Suit — Aiman | ANGKON",
    seoDescription:
      "Elevate festive occasions: Alita by Aiman features a lavender embroidered top paired with a tailored garara silhouette and delicate dupatta. ৳8,800 with COD.",
    h1: "Alita – Lavender Garara 3-Piece Embroidered Suit by Aiman",
    targetKeywords: [
      "lavender garara suit bd",
      "garara dress for women bangladesh",
      "aiman alita lavender suit",
      "wedding guest garara three piece",
    ],
    imageAlt:
      "Alita lavender 3-piece suit featuring flared garara trousers and intricate floral embroidered kameez",
  },
  "emerald-green-embroidered-pakistani-suit": {
    slug: "emerald-green-embroidered-pakistani-suit",
    seoTitle: "Emerald Green & Black Lace Embroidered 3-Piece Suit — Aiman | ANGKON",
    seoDescription:
      "Rich emerald green 3-piece dress by Aiman with contrasting black floral embroidery and intricate lace borders. Sophisticated ethnic wear for ৳8,800.",
    h1: "Emerald Green & Black Lace 3-Piece Embroidered Suit by Aiman",
    targetKeywords: [
      "emerald green black lace dress",
      "green three piece suit for women bd",
      "aiman emerald green suit",
      "formal evening ethnic wear",
    ],
    imageAlt:
      "Rich emerald green kameez with black floral needlework embroidery and detailed lace hemline",
  },
  "mint-bloom-floral-embroidered-suit": {
    slug: "mint-bloom-floral-embroidered-suit",
    seoTitle: "Mint Bloom Pastel Floral Embroidered 3-Piece Suit — Aiman | ANGKON",
    seoDescription:
      "Refreshing pastel style: Mint Bloom 3-piece dress by Aiman with pink floral embroidery, silver detailing, and pearl-button accents. ৳8,800 with COD.",
    h1: "Mint Bloom – Pastel Floral Embroidered 3-Piece Suit by Aiman",
    targetKeywords: [
      "mint green three piece dress",
      "floral embroidered dress bd",
      "pastel ethnic wear for women",
      "eid collection three piece",
    ],
    imageAlt:
      "Mint green embroidered suit with soft pink floral embellishments and pearl button detailing",
  },

  // ── Safa-Marwa Collection (BDT 8,800) ──
  "safa-marwa-black-floral-embroidered-suit": {
    slug: "safa-marwa-black-floral-embroidered-suit",
    seoTitle: "Safa-Marwa Black & Red Floral Embroidered 3-Piece Suit | ANGKON",
    seoDescription:
      "Safa-Marwa classic black 3-piece suit featuring vibrant red floral embroidery, subtle gold accents, and delicate black lace trims. ৳8,800 with nationwide COD.",
    h1: "Safa-Marwa – Black & Red Floral Embroidered 3-Piece Suit",
    targetKeywords: [
      "safa marwa three piece bd",
      "black and red embroidered suit",
      "black party wear three piece",
      "designer floral embroidered dress",
    ],
    imageAlt:
      "Safa-Marwa black 3-piece suit with vivid red floral embroidery, gold accents, and black lace trims",
  },
};

/**
 * Returns customer-intent SEO metadata for a product.
 * If the product is in the catalog dictionary, uses the curated entry.
 * Otherwise, algorithmically constructs a targeted, non-stuffed title and description.
 */
export function getProductSeo(product: WooProduct): ProductSeoEntry {
  const existing = PRODUCT_SEO_CATALOG[product.slug];
  if (existing) {
    return existing;
  }

  const brandAttr = product.attributes?.find((a) => a.name.toLowerCase() === "brand")?.options?.[0];
  const collectionAttr = product.attributes?.find((a) => a.name.toLowerCase() === "collection")?.options?.[0];
  const colorAttr = product.attributes?.find((a) => a.name.toLowerCase() === "color")?.options?.[0];
  const outfitAttr = product.attributes?.find((a) => a.name.toLowerCase() === "outfit")?.options?.[0] || "3-Piece Suit";

  const brandSuffix = collectionAttr
    ? `${brandAttr || "ANGKON"} ${collectionAttr}`
    : brandAttr || "ANGKON";

  const seoTitle = `${product.name} — ${outfitAttr} | ${brandSuffix}`;

  const cleanDesc = (product.short_description || product.description || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);

  const seoDescription =
    cleanDesc ||
    `Shop ${product.name} at ANGKON. ${colorAttr ? `Exquisite ${colorAttr} ensemble.` : ""} Handcrafted luxury ethnic wear with Cash on Delivery across Bangladesh.`;

  return {
    slug: product.slug,
    seoTitle,
    seoDescription,
    h1: product.name,
    targetKeywords: ["three piece dress", "embroidered suit", product.name.toLowerCase()],
    imageAlt: `${product.name} — Luxury Embroidered ${outfitAttr}`,
  };
}
