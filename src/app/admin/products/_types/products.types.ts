export interface WCProductRaw {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  total_sales: number;
  date_created: string;
  shipping_class: string;
  shipping_class_id: number;
  images: { id: number; src: string; alt: string }[];
  categories: { id: number; name: string; slug: string }[];
  buy_price?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta_data?: { id?: number; key: string; value: any }[];
}

export function getBuyPrice(product: WCProductRaw): number {
  if (product.buy_price) {
    const parsed = parseFloat(product.buy_price);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const metaVal = product.meta_data?.slice().reverse().find((m) => m.key === "_buy_price")?.value;
  if (metaVal != null) {
    const parsed = parseFloat(String(metaVal));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

export function getDeliveryFees(product: WCProductRaw): { inside: number | null; outside: number | null } {
  const insideRaw = product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_inside")?.value;
  const outsideRaw = product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_outside")?.value;
  const insideStr = insideRaw != null ? String(insideRaw).trim() : "";
  const outsideStr = outsideRaw != null ? String(outsideRaw).trim() : "";
  const insideParsed = insideStr !== "" ? Number.parseInt(insideStr, 10) : NaN;
  const outsideParsed = outsideStr !== "" ? Number.parseInt(outsideStr, 10) : NaN;
  return {
    inside: Number.isFinite(insideParsed) ? insideParsed : null,
    outside: Number.isFinite(outsideParsed) ? outsideParsed : null,
  };
}

export interface InventorySummary {
  totalUnits: number;
  costVal: number;
  itemsWithCost: number;
  inStockCount: number;
  outOfStockCount: number;
}
