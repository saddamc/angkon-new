export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "1480517547316620";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq?: any;
    __angkon_meta_test_code?: string;
  }
}

function getActiveTestEventCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.__angkon_meta_test_code?.trim()) {
    return window.__angkon_meta_test_code.trim();
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("test_event_code");
    if (code?.trim()) return code.trim();
  } catch {
    // Ignore URL parsing errors
  }
  return undefined;
}

function logEventTelemetry(name: string, payload: Record<string, unknown>, testCode?: string) {
  if (typeof window === "undefined") return;

  const url = window.location.pathname + window.location.search;

  // Local window event dispatch for live UI updates
  try {
    window.dispatchEvent(
      new CustomEvent("angkon_meta_event", {
        detail: {
          name,
          parameters: payload,
          url,
          testEventCode: testCode,
          timestamp: new Date().toISOString(),
        },
      })
    );
  } catch {
    // Ignore event dispatch errors
  }

  // Non-blocking telemetry to server event buffer
  try {
    const data = JSON.stringify({
      name,
      parameters: payload,
      url,
      testEventCode: testCode,
      source: "browser",
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon("/api/admin/pixel/events", blob);
    } else {
      fetch("/api/admin/pixel/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Ignore logging errors so customer checkout is never affected
  }
}

/**
 * Fires a standard PageView event.
 */
export function pageview() {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    const testCode = getActiveTestEventCode();
    const payload = testCode ? { test_event_code: testCode } : {};
    window.fbq("track", "PageView", payload);
    logEventTelemetry("PageView", payload, testCode);
  }
}

/**
 * Fires custom or standard events with parameters.
 */
export function event(name: string, options: Record<string, unknown> = {}) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    const testCode = getActiveTestEventCode();
    const finalPayload = testCode
      ? { ...options, test_event_code: testCode }
      : { ...options };

    window.fbq("track", name, finalPayload);
    logEventTelemetry(name, finalPayload, testCode);
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
