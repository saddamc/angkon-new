import { normalizeMetaContentIds } from "@/lib/meta-product-id";

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim() || "";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq?: any;
    __angkon_meta_enabled?: boolean;
    __angkon_meta_test_code?: string;
    __angkon_pixel_events_config?: {
      trackPageView?: boolean;
      trackViewContent?: boolean;
      trackAddToCart?: boolean;
      trackInitiateCheckout?: boolean;
      trackPurchase?: boolean;
    };
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

export function logEventTelemetry(name: string, payload: Record<string, unknown>, testCode?: string) {
  if (typeof window === "undefined") return;
  if (window.__angkon_meta_enabled === false) return;

  const cfg = window.__angkon_pixel_events_config;
  if (cfg) {
    if (name === "PageView" && (cfg.trackPageView === false || (cfg as Record<string, unknown>).pageView === false)) return;
    if (name === "ViewContent" && (cfg.trackViewContent === false || (cfg as Record<string, unknown>).viewContent === false)) return;
    if (name === "AddToCart" && (cfg.trackAddToCart === false || (cfg as Record<string, unknown>).addToCart === false)) return;
    if (name === "InitiateCheckout" && (cfg.trackInitiateCheckout === false || (cfg as Record<string, unknown>).initiateCheckout === false)) return;
    if (name === "Purchase" && (cfg.trackPurchase === false || (cfg as Record<string, unknown>).purchase === false)) return;
  }

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
      eventId:
        typeof payload.eventId === "string"
          ? payload.eventId
          : typeof payload.event_id === "string"
          ? payload.event_id
          : undefined,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon("/api/pixel/events", blob);
    } else {
      fetch("/api/pixel/events", {
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
 * Generates a stable event ID for deterministic browser & server deduplication.
 */
export function generateEventId(prefix = "ev"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Fires a standard PageView event.
 */
export function pageview(eventId?: string) {
  if (typeof window !== "undefined" && window.__angkon_meta_enabled === false) {
    return;
  }
  const cfg = typeof window !== "undefined" ? window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackPageView === false || (cfg as Record<string, unknown>).pageView === false)) {
    return;
  }
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    const testCode = getActiveTestEventCode();
    const payload = testCode ? { test_event_code: testCode } : {};
    if (eventId) {
      window.fbq("track", "PageView", payload, { eventID: eventId });
    } else {
      window.fbq("track", "PageView", payload);
    }
    logEventTelemetry("PageView", { ...payload, ...(eventId ? { eventId } : {}) }, testCode);
  }
}

/**
 * Fires custom or standard events with parameters and optional eventID for Meta CAPI deduplication.
 */
export function event(
  name: string,
  options: Record<string, unknown> = {},
  eventId?: string
) {
  if (typeof window !== "undefined" && window.__angkon_meta_enabled === false) {
    return;
  }
  const cfg = typeof window !== "undefined" ? window.__angkon_pixel_events_config : undefined;
  if (cfg) {
    if (name === "PageView" && (cfg.trackPageView === false || (cfg as Record<string, unknown>).pageView === false)) return;
    if (name === "ViewContent" && (cfg.trackViewContent === false || (cfg as Record<string, unknown>).viewContent === false)) return;
    if (name === "AddToCart" && (cfg.trackAddToCart === false || (cfg as Record<string, unknown>).addToCart === false)) return;
    if (name === "InitiateCheckout" && (cfg.trackInitiateCheckout === false || (cfg as Record<string, unknown>).initiateCheckout === false)) return;
    if (name === "Purchase" && (cfg.trackPurchase === false || (cfg as Record<string, unknown>).purchase === false)) return;
  }
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    const testCode = getActiveTestEventCode();
    const normalizedOptions: Record<string, unknown> = { ...options };

    // Keep browser content_ids byte-for-byte aligned with the catalog feed and CAPI.
    if (Array.isArray(normalizedOptions.content_ids)) {
      normalizedOptions.content_ids = normalizeMetaContentIds(normalizedOptions.content_ids);
    }

    const finalPayload = testCode
      ? { ...normalizedOptions, test_event_code: testCode }
      : { ...normalizedOptions };

    if (eventId) {
      window.fbq("track", name, finalPayload, { eventID: eventId });
    } else {
      window.fbq("track", name, finalPayload);
    }

    logEventTelemetry(name, { ...finalPayload, ...(eventId ? { eventId } : {}) }, testCode);
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
  event_id?: string;
}

export function trackViewContent(params: ViewContentParams) {
  if (typeof window !== "undefined" && window.__angkon_meta_enabled === false) {
    return;
  }
  const cfg = typeof window !== "undefined" ? window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackViewContent === false || (cfg as Record<string, unknown>).viewContent === false)) {
    return;
  }
  event(
    "ViewContent",
    {
      content_name: params.content_name,
      content_category: params.content_category || "Apparel",
      content_ids: params.content_ids || [],
      content_type: params.content_type || "product",
      value: params.value ?? 0,
      currency: params.currency || "BDT",
    },
    params.event_id
  );
}

export interface AddToCartParams {
  content_name: string;
  content_ids?: (string | number)[];
  content_type?: string;
  value?: number;
  currency?: string;
  event_id?: string;
}

export function trackAddToCart(params: AddToCartParams) {
  if (typeof window !== "undefined" && window.__angkon_meta_enabled === false) {
    return;
  }
  const cfg = typeof window !== "undefined" ? window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackAddToCart === false || (cfg as Record<string, unknown>).addToCart === false)) {
    return;
  }
  event(
    "AddToCart",
    {
      content_name: params.content_name,
      content_ids: params.content_ids || [],
      content_type: params.content_type || "product",
      value: params.value ?? 0,
      currency: params.currency || "BDT",
    },
    params.event_id
  );
}

export interface InitiateCheckoutParams {
  num_items: number;
  value: number;
  currency?: string;
  content_ids?: (string | number)[];
  event_id?: string;
}

export function trackInitiateCheckout(params: InitiateCheckoutParams) {
  if (typeof window !== "undefined" && window.__angkon_meta_enabled === false) {
    return;
  }
  const cfg = typeof window !== "undefined" ? window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackInitiateCheckout === false || (cfg as Record<string, unknown>).initiateCheckout === false)) {
    return;
  }
  event(
    "InitiateCheckout",
    {
      num_items: params.num_items,
      value: params.value,
      currency: params.currency || "BDT",
      content_ids: params.content_ids || [],
      content_type: "product",
    },
    params.event_id
  );
}

export interface PurchaseParams {
  order_id: string | number;
  value: number;
  currency?: string;
  num_items?: number;
  content_ids?: (string | number)[];
  event_id?: string;
}

/**
 * Tracks a purchase conversion with deduplication eventID and idempotency lock
 * to prevent duplicate purchase counting on page refresh or back navigation.
 */
export function trackPurchase(params: PurchaseParams) {
  if (typeof window !== "undefined" && window.__angkon_meta_enabled === false) {
    return;
  }
  const cfg = typeof window !== "undefined" ? window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackPurchase === false || (cfg as Record<string, unknown>).purchase === false)) {
    return;
  }
  const orderIdStr = String(params.order_id || "").trim();
  const eventId = params.event_id || (orderIdStr ? `order_${orderIdStr}` : undefined);

  // Client-side deduplication lock: only fire once per unique order in this session
  if (typeof window !== "undefined" && orderIdStr) {
    const sessionKey = `angkon_meta_purchase_fired_${orderIdStr}`;
    try {
      if (sessionStorage.getItem(sessionKey) === "true") {
        return; // Already tracked for this order, safely skip duplicate
      }
      sessionStorage.setItem(sessionKey, "true");
    } catch {
      /* ignore storage access restrictions */
    }
  }

  event(
    "Purchase",
    {
      order_id: orderIdStr,
      value: params.value,
      currency: params.currency || "BDT",
      num_items: params.num_items ?? 1,
      content_ids: params.content_ids || [],
      content_type: "product",
    },
    eventId
  );
}
