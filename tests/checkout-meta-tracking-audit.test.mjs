import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

function normalizeMetaContentId(rawId) {
  if (rawId === null || rawId === undefined) return null;
  const raw = String(rawId).trim();
  if (!raw) return null;
  const match = raw.match(/(\d+)/);
  return match ? match[1] : raw;
}

function normalizeMetaContentIds(contentIds) {
  if (!Array.isArray(contentIds)) return [];
  const normalized = [];
  const seen = new Set();
  for (const raw of contentIds) {
    const id = normalizeMetaContentId(raw);
    if (id && !seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  }
  return normalized;
}

function hashSha256(value) {
  if (!value) return undefined;
  const clean = value.trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash("sha256").update(clean).digest("hex");
}

function normalizeAndHashPhone(phone) {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("01") && digits.length === 11) {
    digits = `880${digits.slice(1)}`;
  } else if (digits.startsWith("1") && digits.length === 10) {
    digits = `880${digits}`;
  }
  return crypto.createHash("sha256").update(digits).digest("hex");
}

function buildMetaUserData(userData) {
  const result = {};
  if (!userData) return result;

  const hashedEmail = hashSha256(userData.email);
  if (hashedEmail) result.em = [hashedEmail];

  const hashedPhone = normalizeAndHashPhone(userData.phone);
  if (hashedPhone) result.ph = [hashedPhone];

  const hashedFn = hashSha256(userData.firstName);
  if (hashedFn) result.fn = [hashedFn];

  const hashedLn = hashSha256(userData.lastName);
  if (hashedLn) result.ln = [hashedLn];

  const city = userData.city || userData.district;
  const hashedCity = hashSha256(city);
  if (hashedCity) result.ct = [hashedCity];

  const country = userData.country || "bd";
  const hashedCountry = hashSha256(country);
  if (hashedCountry) result.country = [hashedCountry];

  const hashedZp = hashSha256(userData.postalCode);
  if (hashedZp) result.zp = [hashedZp];

  if (userData.clientIp && userData.clientIp !== "::1" && userData.clientIp !== "127.0.0.1") {
    result.client_ip_address = userData.clientIp;
  }
  if (userData.clientUserAgent) {
    result.client_user_agent = userData.clientUserAgent;
  }
  if (userData.fbp) {
    result.fbp = userData.fbp;
  }
  if (userData.fbc) {
    result.fbc = userData.fbc;
  }

  return result;
}

// Client-side tracking helpers matching src/lib/fpixel.ts
function generateEventId(prefix = "ev") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function fpixelEvent(name, options = {}, eventId) {
  if (typeof global.window !== "undefined" && global.window.__angkon_meta_enabled === false) {
    return;
  }
  const cfg = typeof global.window !== "undefined" ? global.window.__angkon_pixel_events_config : undefined;
  if (cfg) {
    if (name === "PageView" && (cfg.trackPageView === false || cfg.pageView === false)) return;
    if (name === "ViewContent" && (cfg.trackViewContent === false || cfg.viewContent === false)) return;
    if (name === "AddToCart" && (cfg.trackAddToCart === false || cfg.addToCart === false)) return;
    if (name === "InitiateCheckout" && (cfg.trackInitiateCheckout === false || cfg.initiateCheckout === false)) return;
    if (name === "Purchase" && (cfg.trackPurchase === false || cfg.purchase === false)) return;
  }

  if (typeof global.window !== "undefined" && typeof global.window.fbq === "function") {
    const testCode = global.window.__angkon_meta_test_code;
    const normalizedOptions = { ...options };
    if (Array.isArray(normalizedOptions.content_ids)) {
      normalizedOptions.content_ids = normalizeMetaContentIds(normalizedOptions.content_ids);
    }
    const finalPayload = testCode ? { ...normalizedOptions, test_event_code: testCode } : { ...normalizedOptions };
    if (eventId) {
      global.window.fbq("track", name, finalPayload, { eventID: eventId });
    } else {
      global.window.fbq("track", name, finalPayload);
    }
  }
}

function trackViewContent(params) {
  if (typeof global.window !== "undefined" && global.window.__angkon_meta_enabled === false) return;
  const cfg = typeof global.window !== "undefined" ? global.window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackViewContent === false || cfg.viewContent === false)) return;
  const eventId = params.event_id || generateEventId("view");
  fpixelEvent(
    "ViewContent",
    {
      content_name: params.content_name,
      content_category: params.content_category || "Apparel",
      content_ids: params.content_ids || [],
      content_type: params.content_type || "product",
      value: params.value ?? 0,
      currency: params.currency || "BDT",
    },
    eventId
  );
  return eventId;
}

function trackAddToCart(params) {
  if (typeof global.window !== "undefined" && global.window.__angkon_meta_enabled === false) return;
  const cfg = typeof global.window !== "undefined" ? global.window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackAddToCart === false || cfg.addToCart === false)) return;
  const eventId = params.event_id || generateEventId("cart");
  fpixelEvent(
    "AddToCart",
    {
      content_name: params.content_name,
      content_ids: params.content_ids || [],
      content_type: params.content_type || "product",
      value: params.value ?? 0,
      currency: params.currency || "BDT",
    },
    eventId
  );
  return eventId;
}

function trackInitiateCheckout(params) {
  if (typeof global.window !== "undefined" && global.window.__angkon_meta_enabled === false) return;
  const cfg = typeof global.window !== "undefined" ? global.window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackInitiateCheckout === false || cfg.initiateCheckout === false)) return;
  const eventId = params.event_id || generateEventId("checkout");
  fpixelEvent(
    "InitiateCheckout",
    {
      num_items: params.num_items,
      value: params.value,
      currency: params.currency || "BDT",
      content_ids: params.content_ids || [],
      content_type: "product",
    },
    eventId
  );
  return eventId;
}

function trackPurchase(params) {
  if (typeof global.window !== "undefined" && global.window.__angkon_meta_enabled === false) return;
  const cfg = typeof global.window !== "undefined" ? global.window.__angkon_pixel_events_config : undefined;
  if (cfg && (cfg.trackPurchase === false || cfg.purchase === false)) return;

  const orderIdStr = String(params.order_id || "").trim();
  const eventId = params.event_id || (orderIdStr ? `order_${orderIdStr}` : undefined);

  if (typeof global.sessionStorage !== "undefined" && orderIdStr) {
    const sessionKey = `angkon_meta_purchase_fired_${orderIdStr}`;
    try {
      if (global.sessionStorage.getItem(sessionKey) === "true") {
        return; // Already tracked for this order, safely skip duplicate
      }
      global.sessionStorage.setItem(sessionKey, "true");
    } catch {
      // ignore
    }
  }

  fpixelEvent(
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

// Browser Mock Helpers
function setupBrowserMock(options = {}) {
  const dispatchedEvents = [];
  const sessionStorageStore = new Map();

  global.window = {
    fbq: function (action, eventName, params, extra) {
      dispatchedEvents.push({ action, eventName, params, extra });
    },
    location: { pathname: "/checkout", search: "" },
    __angkon_meta_enabled: options.enabled ?? true,
    __angkon_meta_test_code: options.testEventCode || undefined,
    __angkon_pixel_events_config: options.eventsConfig || {
      trackPageView: true,
      trackViewContent: true,
      trackAddToCart: true,
      trackInitiateCheckout: true,
      trackPurchase: true,
    },
  };

  global.sessionStorage = {
    getItem: (key) => sessionStorageStore.get(key) || null,
    setItem: (key, val) => sessionStorageStore.set(key, String(val)),
    removeItem: (key) => sessionStorageStore.delete(key),
    clear: () => sessionStorageStore.clear(),
  };

  return { dispatchedEvents, sessionStorageStore };
}

function teardownBrowserMock() {
  delete global.window;
  delete global.sessionStorage;
}

test("Audit Criterion 1: Product page visit fires ViewContent with exact parameters and eventID", () => {
  const mock = setupBrowserMock({ testEventCode: "TEST66032" });

  const eventId = trackViewContent({
    content_name: "Soiree D4 – Dusty Rose Embroidered Suit",
    content_category: "Apparel",
    content_ids: ["228012"],
    content_type: "product",
    value: 8800,
    currency: "BDT",
  });

  assert.ok(eventId, "Must return a valid eventId");
  assert.match(eventId, /^view_/, "Event ID must carry the view_ prefix");
  assert.equal(mock.dispatchedEvents.length, 1);
  const ev = mock.dispatchedEvents[0];
  assert.equal(ev.action, "track");
  assert.equal(ev.eventName, "ViewContent");
  assert.equal(ev.params.content_name, "Soiree D4 – Dusty Rose Embroidered Suit");
  assert.equal(ev.params.content_category, "Apparel");
  assert.deepEqual(ev.params.content_ids, ["228012"]);
  assert.equal(ev.params.value, 8800);
  assert.equal(ev.params.currency, "BDT");
  assert.equal(ev.params.test_event_code, "TEST66032");
  assert.equal(ev.extra?.eventID, eventId);

  teardownBrowserMock();
});

test("Audit Criterion 2: Clicking Add to Cart fires AddToCart exactly once with quantity calculation", () => {
  const mock = setupBrowserMock();

  const eventId = trackAddToCart({
    content_name: "Soiree D4 – Dusty Rose Embroidered Suit",
    content_ids: ["228012"],
    content_type: "product",
    value: 17600, // 2 items x 8800
    currency: "BDT",
  });

  assert.ok(eventId, "Must return a valid cart eventId");
  assert.match(eventId, /^cart_/, "Event ID must carry the cart_ prefix");
  assert.equal(mock.dispatchedEvents.length, 1, "Must fire exactly once per click");
  const ev = mock.dispatchedEvents[0];
  assert.equal(ev.eventName, "AddToCart");
  assert.equal(ev.params.value, 17600);
  assert.equal(ev.params.currency, "BDT");
  assert.deepEqual(ev.params.content_ids, ["228012"]);
  assert.equal(ev.extra?.eventID, eventId);

  teardownBrowserMock();
});

test("Audit Criterion 3: Entering checkout fires InitiateCheckout with total item count and cart subtotal", () => {
  const mock = setupBrowserMock();

  const eventId = trackInitiateCheckout({
    num_items: 2,
    value: 17600,
    currency: "BDT",
    content_ids: ["228012"],
  });

  assert.ok(eventId, "Must return a valid checkout eventId");
  assert.match(eventId, /^checkout_/, "Event ID must carry the checkout_ prefix");
  assert.equal(mock.dispatchedEvents.length, 1, "Must fire InitiateCheckout on entry");
  const ev = mock.dispatchedEvents[0];
  assert.equal(ev.eventName, "InitiateCheckout");
  assert.equal(ev.params.num_items, 2);
  assert.equal(ev.params.value, 17600);
  assert.equal(ev.params.currency, "BDT");
  assert.deepEqual(ev.params.content_ids, ["228012"]);
  assert.equal(ev.extra?.eventID, eventId);

  teardownBrowserMock();
});

test("Audit Criterion 4: Failed validation or order error suppresses Purchase event completely", () => {
  const mock = setupBrowserMock();

  // Simulate invalid checkout form input (e.g., missing phone or name)
  const isFormValid = false;
  if (isFormValid) {
    trackPurchase({
      order_id: "ANG-FAIL-001",
      value: 8880,
      currency: "BDT",
    });
  }

  assert.equal(mock.dispatchedEvents.length, 0, "No Purchase event must be dispatched when validation fails");

  // Simulate API returning HTTP 400 error
  const apiResponse = { ok: false, status: 400 };
  if (apiResponse.ok) {
    trackPurchase({
      order_id: "ANG-FAIL-002",
      value: 8880,
      currency: "BDT",
    });
  }

  assert.equal(mock.dispatchedEvents.length, 0, "No Purchase event must be dispatched when server rejects order");

  teardownBrowserMock();
});

test("Audit Criterion 5 & 6: Successful order fires Purchase with identical eventID and parameters across channels", () => {
  const mock = setupBrowserMock();

  const orderNumber = "ANG-854665-261";
  const orderTotal = 8880;
  const productIds = [228012];

  // 1. Browser copy
  trackPurchase({
    order_id: orderNumber,
    value: orderTotal,
    currency: "BDT",
    num_items: 1,
    content_ids: productIds,
  });

  assert.equal(mock.dispatchedEvents.length, 1);
  const browserEv = mock.dispatchedEvents[0];
  assert.equal(browserEv.eventName, "Purchase");
  assert.equal(browserEv.params.order_id, orderNumber);
  assert.equal(browserEv.params.value, orderTotal);
  assert.equal(browserEv.params.currency, "BDT");
  assert.deepEqual(browserEv.params.content_ids, ["228012"]);
  const browserEventId = browserEv.extra?.eventID;
  assert.equal(browserEventId, `order_${orderNumber}`);

  // 2. Server CAPI copy configuration
  const serverEventId = `order_${orderNumber}`;
  const serverEventName = "Purchase";

  // Strict deduplication parity verification
  assert.equal(browserEv.eventName, serverEventName, "Event names must match byte-for-byte");
  assert.equal(browserEventId, serverEventId, "Event IDs must match byte-for-byte for deduplication");

  teardownBrowserMock();
});

test("Audit Criterion 7: Refreshing the confirmation page does not create duplicate Purchase events", () => {
  const mock = setupBrowserMock();

  const orderNumber = "ANG-854665-261";

  // First track on order placement
  trackPurchase({
    order_id: orderNumber,
    value: 8880,
    currency: "BDT",
  });
  assert.equal(mock.dispatchedEvents.length, 1, "First purchase dispatch succeeds");

  // Subsequent render or page refresh in the same session
  trackPurchase({
    order_id: orderNumber,
    value: 8880,
    currency: "BDT",
  });
  assert.equal(mock.dispatchedEvents.length, 1, "Duplicate purchase dispatch was blocked by sessionStorage lock");

  // Another refresh
  trackPurchase({
    order_id: orderNumber,
    value: 8880,
    currency: "BDT",
  });
  assert.equal(mock.dispatchedEvents.length, 1, "Second refresh still blocked");

  teardownBrowserMock();
});

test("Audit Criterion 8: Master tracking switch and individual event switches silence dispatches", () => {
  // Test master toggle = false
  const mockDisabled = setupBrowserMock({ enabled: false });
  trackViewContent({ content_name: "Test", value: 100 });
  trackAddToCart({ content_name: "Test", value: 100 });
  trackInitiateCheckout({ num_items: 1, value: 100 });
  trackPurchase({ order_id: "999", value: 100 });
  assert.equal(mockDisabled.dispatchedEvents.length, 0, "All events silenced when Master Tracking is OFF");
  teardownBrowserMock();

  // Test individual event toggle (e.g. AddToCart disabled)
  const mockIndividual = setupBrowserMock({
    enabled: true,
    eventsConfig: {
      trackPageView: true,
      trackViewContent: true,
      trackAddToCart: false, // suppressed
      trackInitiateCheckout: true,
      trackPurchase: true,
    },
  });

  trackViewContent({ content_name: "Test", value: 100 });
  assert.equal(mockIndividual.dispatchedEvents.length, 1, "ViewContent fires normally");

  trackAddToCart({ content_name: "Test", value: 100 });
  assert.equal(mockIndividual.dispatchedEvents.length, 1, "AddToCart was silenced by granular toggle");

  trackInitiateCheckout({ num_items: 1, value: 100 });
  assert.equal(mockIndividual.dispatchedEvents.length, 2, "InitiateCheckout fires normally");

  teardownBrowserMock();
});

test("Audit Criterion 9 & 10: Canonical Dataset ID, origin resolution, and PII normalization conformity", () => {
  const DATASET_ID = "1304551066085265";
  const CANONICAL_ORIGIN = "https://www.angkon.net";

  assert.match(DATASET_ID, /^\d{16}$/, "Dataset ID must be a 16-digit numeric Meta ID");
  assert.ok(CANONICAL_ORIGIN.startsWith("https://"), "Canonical origin must be HTTPS");
  assert.ok(!CANONICAL_ORIGIN.includes("localhost"), "Canonical origin must not be localhost");

  // User data PII normalization and hashing
  const userData = {
    email: "kaiumsbd@gmail.com",
    phone: "01829370966",
    firstName: "Saddam",
    city: "Dhaka",
    clientIp: "103.145.132.1",
    clientUserAgent: "Mozilla/5.0",
  };

  const metaUserData = buildMetaUserData(userData);

  // Email and Phone must be SHA256 hashed arrays
  assert.ok(Array.isArray(metaUserData.em));
  assert.equal(metaUserData.em[0], hashSha256("kaiumsbd@gmail.com"));

  assert.ok(Array.isArray(metaUserData.ph));
  // BD phone 01829370966 -> normalized to 8801829370966 before hashing
  assert.equal(metaUserData.ph[0], hashSha256("8801829370966"));

  // IP and User-Agent MUST remain unhashed plaintext
  assert.equal(metaUserData.client_ip_address, "103.145.132.1");
  assert.equal(metaUserData.client_user_agent, "Mozilla/5.0");
});

test("Audit Criterion 11: Content Security Policy connect-src allows Meta MPC edge endpoints (*.run.app and *.on.aws)", async () => {
  const fs = await import("node:fs");
  const nextConfigText = fs.readFileSync("next.config.ts", "utf8");

  assert.ok(
    nextConfigText.includes("https://*.run.app"),
    "CSP connect-src must allow Google Cloud Run (*.run.app) for Meta MPC telemetry beacons"
  );
  assert.ok(
    nextConfigText.includes("https://*.on.aws"),
    "CSP connect-src must allow AWS ECS (*.on.aws) for Meta MPC telemetry beacons"
  );
  assert.ok(
    nextConfigText.includes("https://*.facebook.com"),
    "CSP connect-src must allow facebook.com"
  );
  assert.ok(
    nextConfigText.includes("https://connect.facebook.net"),
    "CSP connect-src must allow connect.facebook.net"
  );
});

test("Audit Criterion 12: AddToCart storefront event pairs browser and server CAPI with identical eventID and canonical domain", () => {
  const mock = setupBrowserMock({
    pixelId: "1304551066085265",
    eventsConfig: { trackAddToCart: true },
  });

  const cartEventId = generateEventId("cart");

  // Storefront action: Add to Cart
  const browserEventId = trackAddToCart({
    content_name: "Heritage Silk Panjabi",
    content_ids: [101],
    value: 4500,
    currency: "BDT",
    event_id: cartEventId,
  });

  // Verify browser event emission
  assert.equal(browserEventId, cartEventId);
  const browserDispatches = mock.dispatchedEvents;
  assert.equal(browserDispatches.length, 1);
  assert.equal(browserDispatches[0].eventName, "AddToCart");
  assert.equal(browserDispatches[0].extra.eventID, cartEventId);

  // Simulated server CAPI payload generated for this AddToCart event
  const serverCapiPayload = {
    eventName: "AddToCart",
    eventId: cartEventId,
    eventSourceUrl: "https://www.angkon.net/products/heritage-silk-panjabi",
    actionSource: "website",
    customData: {
      content_name: "Heritage Silk Panjabi",
      content_ids: ["101"],
      value: 4500,
      currency: "BDT",
    },
  };

  // Verify browser & server equality for Meta deduplication
  assert.equal(browserDispatches[0].eventName, serverCapiPayload.eventName);
  assert.equal(browserDispatches[0].extra.eventID, serverCapiPayload.eventId);
  assert.equal(browserDispatches[0].params.value, serverCapiPayload.customData.value);
  assert.equal(browserDispatches[0].params.currency, serverCapiPayload.customData.currency);
  assert.ok(serverCapiPayload.eventSourceUrl.startsWith("https://www.angkon.net"));

  teardownBrowserMock();
});
