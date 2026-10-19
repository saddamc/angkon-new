export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq?: any;
  }
}

/**
 * Fires a standard PageView event.
 */
export function pageview() {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "PageView");
  }
}

/**
 * Fires custom or standard events with parameters.
 */
export function event(name: string, options: Record<string, unknown> = {}) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", name, options);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Standard E-Commerce Events
 * ────────────────────────────────────────────────────────────────────────── */

export interface ViewContentParams {
  content_name: string;
  content_category?: string;
  content_ids?: (string | number)[];
  content_type?: string;
  value?: number;
  currency?: string;
}

export function trackViewContent(params: ViewContentParams) {
  event("ViewContent", {
    content_name: params.content_name,
    content_category: params.content_category || "Apparel",
    content_ids: params.content_ids || [],
    content_type: params.content_type || "product",
    value: params.value ?? 0,
    currency: params.currency || "BDT",
  });
}

export interface AddToCartParams {
  content_name: string;
  content_ids?: (string | number)[];
  content_type?: string;
  value?: number;
  currency?: string;
}

export function trackAddToCart(params: AddToCartParams) {
  event("AddToCart", {
    content_name: params.content_name,
    content_ids: params.content_ids || [],
    content_type: params.content_type || "product",
    value: params.value ?? 0,
    currency: params.currency || "BDT",
  });
}

export interface InitiateCheckoutParams {
  num_items: number;
  value: number;
  currency?: string;
  content_ids?: (string | number)[];
}

export function trackInitiateCheckout(params: InitiateCheckoutParams) {
  event("InitiateCheckout", {
    num_items: params.num_items,
    value: params.value,
    currency: params.currency || "BDT",
    content_ids: params.content_ids || [],
    content_type: "product",
  });
}

export interface PurchaseParams {
  order_id: string | number;
  value: number;
  currency?: string;
  num_items?: number;
  content_ids?: (string | number)[];
}

export function trackPurchase(params: PurchaseParams) {
  event("Purchase", {
    order_id: String(params.order_id),
    value: params.value,
    currency: params.currency || "BDT",
    num_items: params.num_items ?? 1,
    content_ids: params.content_ids || [],
    content_type: "product",
  });
}
