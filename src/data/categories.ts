/**
 * Static fashion category configuration.
 * Provides curated images, slugs, and metadata for each main category
 * and its subcategories. The slugs MUST match what's in WooCommerce.
 */

export interface SubCategory {
  name: string;
  slug: string;
  icon?: string;
}

export interface FashionCategory {
  name: string;
  slug: string;
  image: string;
  color: string;           // Tailwind bg color for fallback card
  accentColor: string;     // Hex for gradient overlay
  icon: string;            // Emoji icon
  sub: SubCategory[];
}

export const FASHION_CATEGORIES: FashionCategory[] = [
  {
    name: "Men",
    slug: "men",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=800&q=80",
    color: "bg-slate-800",
    accentColor: "#1e293b",
    icon: "👔",
    sub: [
      { name: "T-Shirts", slug: "men-t-shirts", icon: "👕" },
      { name: "Shirts", slug: "men-shirts", icon: "👔" },
      { name: "Polos", slug: "men-polos", icon: "🎽" },
      { name: "Jeans", slug: "men-jeans", icon: "👖" },
      { name: "Pants", slug: "men-pants", icon: "👖" },
      { name: "Hoodies & Sweatshirts", slug: "men-hoodies-sweatshirts", icon: "🧥" },
      { name: "Jackets", slug: "men-jackets", icon: "🧥" },
    ],
  },
  {
    name: "Women",
    slug: "women",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
    color: "bg-rose-700",
    accentColor: "#be123c",
    icon: "👗",
    sub: [
      { name: "Dresses", slug: "women-dresses", icon: "👗" },
      { name: "Tops", slug: "women-tops", icon: "👚" },
      { name: "T-Shirts", slug: "women-t-shirts", icon: "👕" },
      { name: "Shirts", slug: "women-shirts", icon: "👔" },
      { name: "Jeans", slug: "women-jeans", icon: "👖" },
      { name: "Pants", slug: "women-pants", icon: "👖" },
      { name: "Skirts", slug: "women-skirts", icon: "🩱" },
      { name: "Hoodies & Sweatshirts", slug: "women-hoodies-sweatshirts", icon: "🧥" },
      { name: "Jackets", slug: "women-jackets", icon: "🧥" },
    ],
  },
  {
    name: "Kids",
    slug: "kids",
    image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&w=800&q=80",
    color: "bg-amber-500",
    accentColor: "#b45309",
    icon: "🧒",
    sub: [
      { name: "Boys", slug: "kids-boys", icon: "👦" },
      { name: "Girls", slug: "kids-girls", icon: "👧" },
      { name: "Baby", slug: "kids-baby", icon: "👶" },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    color: "bg-emerald-700",
    accentColor: "#065f46",
    icon: "👜",
    sub: [
      { name: "Bags", slug: "accessories-bags", icon: "👜" },
      { name: "Wallets", slug: "accessories-wallets", icon: "👛" },
      { name: "Belts", slug: "accessories-belts", icon: "🔗" },
      { name: "Caps & Hats", slug: "accessories-caps-hats", icon: "🧢" },
      { name: "Sunglasses", slug: "accessories-sunglasses", icon: "🕶️" },
      { name: "Watches", slug: "accessories-watches", icon: "⌚" },
    ],
  },
  {
    name: "Shoes",
    slug: "shoes",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80",
    color: "bg-orange-600",
    accentColor: "#ea580c",
    icon: "👟",
    sub: [
      { name: "Sneakers", slug: "shoes-sneakers", icon: "👟" },
      { name: "Formal", slug: "shoes-formal", icon: "👞" },
      { name: "Boots", slug: "shoes-boots", icon: "🥾" },
      { name: "Heels", slug: "shoes-heels", icon: "👠" },
    ],
  },
  {
    name: "Beauty",
    slug: "beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?auto=format&fit=crop&w=800&q=80",
    color: "bg-pink-500",
    accentColor: "#ec4899",
    icon: "💄",
    sub: [
      { name: "Makeup", slug: "beauty-makeup", icon: "💄" },
      { name: "Skincare", slug: "beauty-skincare", icon: "🧴" },
      { name: "Fragrance", slug: "beauty-fragrance", icon: "✨" },
    ],
  },
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80",
    color: "bg-violet-700",
    accentColor: "#5b21b6",
    icon: "✨",
    sub: [],
  },
  {
    name: "Sale",
    slug: "sale",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80",
    color: "bg-red-600",
    accentColor: "#dc2626",
    icon: "🏷️",
    sub: [],
  },
];

/** Returns a FashionCategory by slug, or undefined */
export function getCategoryBySlug(slug: string): FashionCategory | undefined {
  return FASHION_CATEGORIES.find((c) => c.slug === slug);
}

/** Returns static image for a slug, falling back to a given default */
export function getCategoryImage(slug: string, fallback = ""): string {
  return getCategoryBySlug(slug)?.image ?? fallback;
}
