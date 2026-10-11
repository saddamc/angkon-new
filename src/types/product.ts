export interface WooImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  count?: number;
  parent?: number;
  menu_order?: number;
  description?: string;
  image?: { id?: number; src: string; alt?: string } | null;
  meta_data?: Array<{ key: string; value?: unknown }>;
}


export interface WooAttribute {
  id: number;
  name: string;
  options: string[];
  visible: boolean;
}

export interface WooReview {
  id: number;
  date_created: string;
  review: string;
  reviewer: string;
  rating: number;
  verified: boolean;
  reviewer_avatar_urls?: Record<string, string>;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  sizes: string[];
  images: WooImage[];
  categories: WooCategory[];
  tags: { id: number; name: string; slug: string }[];
  attributes: WooAttribute[];
  sku?: string;
  /** WooCommerce shipping_class_id — 0 means no class assigned */
  shipping_class_id: number;
  /** Available stock count when WC stock management is enabled for this product */
  stock_quantity?: number | null;
  weight?: string;
  /** Custom metadata array for advanced options like delivery charges */
  meta_data?: { id?: number; key: string; value: string }[];
}

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
  /** WC shipping_class_id stored at add-to-cart time — avoids WP calls at checkout */
  shippingClassId: number;
  /** Per-product explicit delivery fees from meta_data */
  deliveryInside: number;
  deliveryOutside: number;
}
