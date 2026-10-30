export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  linked_parents?: number[];
  description: string;
  /** Distinct products shown on this category's storefront page (itself + sub-categories). */
  count: number;
  /** Products listed directly in this category. */
  direct_count?: number;
  menu_order: number;
  meta_data?: { id?: number; key: string; value: unknown }[];
  image?: { id?: number; src: string; alt?: string } | null;
  is_linked?: boolean;
}

export interface CategoryTree extends WCCategory {
  children: WCCategory[];
}

export interface FormData {
  type: "main" | "sub";
  name: string;
  slug: string;
  description: string;
  parent: number;
  linkedParents?: number[];
  imageUrl: string;
  imageAlt: string;
  imageId: number | null;
  isActive: boolean;
  sortOrder: number;
  icon: string;
  bgTheme: string;
}

export const EMPTY_FORM: FormData = {
  type: "main",
  name: "",
  slug: "",
  description: "",
  parent: 0,
  linkedParents: [],
  imageUrl: "",
  imageAlt: "",
  imageId: null,
  isActive: true,
  sortOrder: 0,
  icon: "",
  bgTheme: "blue",
};

export const ICON_CATEGORIES = [
  "All",
  "Fashion",
  "Shoes & Bags",
  "Jewelry",
  "Beauty",
  "Sewing & Craft",
  "Electronics",
  "Home & Living",
  "Kids & Toys",
  "Sports & Gym",
  "Grocery & Food",
  "Deals & Badges",
] as const;

export type IconCategoryType = typeof ICON_CATEGORIES[number];

export interface CuratedIcon {
  label: string;
  icon: string;
  category: IconCategoryType;
  tags: string[];
}
