import test from "node:test";
import assert from "node:assert/strict";

// Pure helper logic simulating normalizePixelSettings and save logic
function normalizePixelSettingsSim(raw, tenantId = "angkon-main") {
  const source = (raw && typeof raw === "object" ? raw : {});

  let pixelId = "";
  if (typeof source.pixelId === "string") {
    pixelId = source.pixelId.trim();
  }

  // Master tracking can only be active if a non-empty pixelId exists
  const enabled = pixelId
    ? typeof source.enabled === "boolean"
      ? source.enabled
      : false
    : false;

  let adAccountId = typeof source.adAccountId === "string" ? source.adAccountId.trim() : "";
  if (adAccountId && !adAccountId.startsWith("act_") && /^\d+$/.test(adAccountId)) {
    adAccountId = `act_${adAccountId}`;
  }

  return {
    tenantId: source.tenantId || tenantId,
    enabled,
    pixelId,
    testEventCode: typeof source.testEventCode === "string" ? source.testEventCode.trim() : "",
    domainVerificationToken:
      typeof source.domainVerificationToken === "string" ? source.domainVerificationToken.trim() : "",
    capiAccessToken: typeof source.capiAccessToken === "string" ? source.capiAccessToken.trim() : "",
    marketingApiAccessToken:
      typeof source.marketingApiAccessToken === "string" ? source.marketingApiAccessToken.trim() : "",
    adAccountId,
    trackPageView: source.trackPageView !== false,
    trackViewContent: source.trackViewContent !== false,
    trackAddToCart: source.trackAddToCart !== false,
    trackInitiateCheckout: source.trackInitiateCheckout !== false,
    trackPurchase: source.trackPurchase !== false,
  };
}

function savePixelSettingsSim(current, update, tenantId = "angkon-main") {
  let finalCapiToken = current.capiAccessToken || "";
  if (typeof update.capiAccessToken === "string") {
    const raw = update.capiAccessToken.trim();
    if (!raw.includes("••••") && !raw.includes("***")) {
      finalCapiToken = raw;
    }
  }

  let finalMarketingToken = current.marketingApiAccessToken || "";
  if (typeof update.marketingApiAccessToken === "string") {
    const raw = update.marketingApiAccessToken.trim();
    if (!raw.includes("••••") && !raw.includes("***")) {
      finalMarketingToken = raw;
    }
  }

  const nextPixelId =
    update.pixelId !== undefined ? update.pixelId.trim() : (current.pixelId || "");

  let nextEnabled = false;
  if (nextPixelId) {
    nextEnabled =
      update.enabled !== undefined ? Boolean(update.enabled) : Boolean(current.enabled);
  }

  return normalizePixelSettingsSim(
    {
      ...current,
      ...update,
      pixelId: nextPixelId,
      enabled: nextEnabled,
      capiAccessToken: finalCapiToken,
      marketingApiAccessToken: finalMarketingToken,
      tenantId,
    },
    tenantId
  );
}

test("Dataset Config 1: Can edit and update Dataset ID to a new valid numeric ID", () => {
  const current = normalizePixelSettingsSim({
    pixelId: "1480517547316620",
    enabled: true,
    capiAccessToken: "EAAG_TEST_TOKEN_XYZ",
  });

  const updated = savePixelSettingsSim(current, {
    pixelId: "1646756900434912",
  });

  assert.equal(updated.pixelId, "1646756900434912");
  assert.equal(updated.enabled, true);
  // Preserves existing CAPI credentials
  assert.equal(updated.capiAccessToken, "EAAG_TEST_TOKEN_XYZ");
});

test("Dataset Config 2: Disconnecting dataset sets pixelId to empty and turns enabled to false", () => {
  const current = normalizePixelSettingsSim({
    pixelId: "1480517547316620",
    enabled: true,
    capiAccessToken: "EAAG_TEST_TOKEN_XYZ",
    adAccountId: "act_123456789",
  });

  // User confirms Disconnect Dataset
  const disconnected = savePixelSettingsSim(current, {
    pixelId: "",
    enabled: false,
  });

  assert.equal(disconnected.pixelId, "");
  assert.equal(disconnected.enabled, false);
  // Existing credentials must remain preserved in database
  assert.equal(disconnected.capiAccessToken, "EAAG_TEST_TOKEN_XYZ");
  assert.equal(disconnected.adAccountId, "act_123456789");
});

test("Dataset Config 3: No automatic resurrection of hardcoded 1480517547316620 on partial update", () => {
  const disconnected = normalizePixelSettingsSim({
    pixelId: "",
    enabled: false,
    capiAccessToken: "EAAG_TOKEN",
  });

  // Toggling an event trigger should not resurrect the old ID
  const partialUpdated = savePixelSettingsSim(disconnected, {
    trackPageView: false,
  });

  assert.equal(partialUpdated.pixelId, "");
  assert.equal(partialUpdated.enabled, false);
  assert.equal(partialUpdated.trackPageView, false);
});

test("Dataset Config 4: Master Tracking toggle persists independently without modifying pixelId or tokens", () => {
  const current = normalizePixelSettingsSim({
    pixelId: "1646756900434912",
    enabled: true,
    capiAccessToken: "EAAG_TOKEN",
  });

  // User clicks toggle to pause tracking
  const paused = savePixelSettingsSim(current, {
    enabled: false,
  });

  assert.equal(paused.enabled, false);
  assert.equal(paused.pixelId, "1646756900434912");
  assert.equal(paused.capiAccessToken, "EAAG_TOKEN");

  // User clicks toggle to resume tracking
  const resumed = savePixelSettingsSim(paused, {
    enabled: true,
  });

  assert.equal(resumed.enabled, true);
  assert.equal(resumed.pixelId, "1646756900434912");
  assert.equal(resumed.capiAccessToken, "EAAG_TOKEN");
});

test("Dataset Config 5: Cannot enable Master Tracking when pixelId is empty", () => {
  const emptyConfig = normalizePixelSettingsSim({
    pixelId: "",
    enabled: false,
  });

  // Attempting to turn enabled to true when pixelId is blank must fail to enable
  const attempt = savePixelSettingsSim(emptyConfig, {
    enabled: true,
  });

  assert.equal(attempt.enabled, false);
  assert.equal(attempt.pixelId, "");
});

test("Dataset Config 6: Masked secret preserves actual token on save", () => {
  const current = normalizePixelSettingsSim({
    pixelId: "1480517547316620",
    enabled: true,
    capiAccessToken: "EAAG_SECRET_TOKEN_VERY_LONG_1234",
  });

  // UI form submits masked token placeholder
  const saved = savePixelSettingsSim(current, {
    capiAccessToken: "EAAG••••••••1234",
  });

  assert.equal(saved.capiAccessToken, "EAAG_SECRET_TOKEN_VERY_LONG_1234");
});

test("Dataset Config 7: Granular standard event suppression silences unchecked events", () => {
  const current = normalizePixelSettingsSim({
    pixelId: "1480517547316620",
    enabled: true,
    trackPageView: true,
    trackPurchase: true,
    trackAddToCart: true,
  });

  // Admin unchecks trackPurchase and trackAddToCart
  const saved = savePixelSettingsSim(current, {
    trackPurchase: false,
    trackAddToCart: false,
  });

  assert.equal(saved.trackPageView, true);
  assert.equal(saved.trackPurchase, false);
  assert.equal(saved.trackAddToCart, false);

  // Simulation of client / server suppression check
  const isPurchaseAllowed = saved.enabled && saved.trackPurchase;
  const isAddToCartAllowed = saved.enabled && saved.trackAddToCart;
  const isPageViewAllowed = saved.enabled && saved.trackPageView;

  assert.equal(isPurchaseAllowed, false);
  assert.equal(isAddToCartAllowed, false);
  assert.equal(isPageViewAllowed, true);
});

test("Dataset Config 8: Master Tracking OFF halts all events regardless of individual triggers", () => {
  const current = normalizePixelSettingsSim({
    pixelId: "1480517547316620",
    enabled: false, // Master tracking OFF
    trackPageView: true,
    trackPurchase: true,
  });

  const isAnyTrackingAllowed = (eventName, settings) => {
    if (!settings.enabled || !settings.pixelId) return false;
    if (eventName === "PageView" && !settings.trackPageView) return false;
    if (eventName === "Purchase" && !settings.trackPurchase) return false;
    return true;
  };

  assert.equal(isAnyTrackingAllowed("PageView", current), false);
  assert.equal(isAnyTrackingAllowed("Purchase", current), false);
});
