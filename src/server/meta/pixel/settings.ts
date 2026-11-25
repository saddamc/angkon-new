/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { DEFAULT_TENANT_ID } from "@/server/auth/tenant";
import {
  encryptTokenString,
  decryptTokenString,
  maskSecret as maskSecretSecure,
} from "@/lib/security/token-encryption";
import type { PixelEventRecord } from "./events";

export { DEFAULT_TENANT_ID };
export const PIXEL_SETTINGS_KEY = "pixel";

export type IntegrationState =
  | "disconnected"
  | "configured"
  | "test-required"
  | "connected"
  | "error";

export interface IntegrationStatusDetail {
  state: IntegrationState;
  label: string;
  detail: string;
}

export interface MetaIntegrationStatuses {
  browserPixel: IntegrationStatusDetail;
  conversionsApi: IntegrationStatusDetail;
  deduplication: IntegrationStatusDetail;
  adAccount: IntegrationStatusDetail;
  domainVerification: IntegrationStatusDetail;
}

export interface PixelSettings {
  tenantId?: string;
  enabled: boolean;
  pixelId: string;
  testEventCode?: string;
  domainVerificationToken?: string;
  domainVerificationMethod?: "dns_txt" | "html_meta_tag";
  metaOwnershipVerified?: boolean;
  metaOwnershipVerifiedAt?: string;
  metaOwnershipSource?: "meta_business_manager" | "manual_confirmation" | "meta_api";
  metaOwnershipConfirmedBy?: string;
  /** Meta Conversions API (CAPI) Dataset Token for server-side event dispatch */
  capiAccessToken?: string;
  /** Meta Marketing API Access Token for retrieving ad account campaigns & reporting */
  marketingApiAccessToken?: string;
  /** Meta Ad Account ID (e.g. act_1234567890 or 1234567890) */
  adAccountId?: string;
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  updatedAt?: string;
}

export interface PublicAdminPixelSettings
  extends Omit<PixelSettings, "capiAccessToken" | "marketingApiAccessToken"> {
  hasCapiAccessToken: boolean;
  maskedCapiAccessToken: string;
  hasMarketingApiAccessToken: boolean;
  maskedMarketingApiAccessToken: string;
  statuses: MetaIntegrationStatuses;
}

export const DEFAULT_PIXEL_SETTINGS: PixelSettings = {
  tenantId: DEFAULT_TENANT_ID,
  enabled: Boolean(process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID),
  pixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim() || "",
  testEventCode: "",
  domainVerificationToken: "",
  domainVerificationMethod: "dns_txt",
  metaOwnershipVerified: false,
  metaOwnershipVerifiedAt: "",
  metaOwnershipSource: "meta_business_manager",
  metaOwnershipConfirmedBy: "",
  capiAccessToken: process.env.META_CAPI_ACCESS_TOKEN?.trim() || "",
  marketingApiAccessToken: "",
  adAccountId: process.env.META_AD_ACCOUNT_ID?.trim() || "",
  trackPageView: true,
  trackViewContent: true,
  trackAddToCart: true,
  trackInitiateCheckout: true,
  trackPurchase: true,
};

/**
 * Mask a secret token for safe display in administrative user interfaces.
 * Example: "EAAG...1234" -> "EAAG••••••••1234"
 */
export function maskSecret(secret?: string): string {
  return maskSecretSecure(secret);
}

/**
 * Evaluates truthful integration states based on configuration and actual telemetry evidence.
 * Never reports "connected" merely because a token or ID is saved.
 */
export function computeIntegrationStatuses(
  settings: PixelSettings,
  events: PixelEventRecord[] = []
): MetaIntegrationStatuses {
  const isEnabled = settings.enabled;
  const hasPixelId = Boolean(settings.pixelId && /^\d{10,25}$/.test(settings.pixelId.trim()));
  const hasCapiToken = Boolean(settings.capiAccessToken && settings.capiAccessToken.trim().length > 10);
  const hasAdAccount = Boolean(settings.adAccountId && settings.adAccountId.trim().length > 4);
  const hasMarketingToken = Boolean(settings.marketingApiAccessToken && settings.marketingApiAccessToken.trim().length > 10);
  const hasDomainToken = Boolean(settings.domainVerificationToken && settings.domainVerificationToken.trim().length > 6);

  // Analyze telemetry
  const hasBrowserEvents = events.some(
    (ev) => ev.source === "browser" && ev.status !== "failed"
  );
  const hasDeliveredServerEvents = events.some(
    (ev) =>
      (ev.source === "server" || ev.source === "test_simulator") &&
      (ev.status === "delivered" || ev.status === "accepted" || ev.status === "sent")
  );
  const lastServerEvent = events.find(
    (ev) => ev.source === "server" || ev.source === "test_simulator"
  );
  const hasServerDeliveryError = lastServerEvent?.status === "failed";

  // 1. Browser Pixel
  let browserPixel: IntegrationStatusDetail;
  if (!hasPixelId) {
    browserPixel = {
      state: "disconnected",
      label: "Not Configured",
      detail: "Dataset ID is not configured. Storefront pixel tracking is inactive.",
    };
  } else if (!isEnabled) {
    browserPixel = {
      state: "disconnected",
      label: "Tracking Paused",
      detail: "Master tracking is turned off. Storefront pixel script is disabled.",
    };
  } else if (hasBrowserEvents) {
    browserPixel = {
      state: "connected",
      label: "Active & Receiving",
      detail: "Browser Pixel script loaded and confirmed receiving storefront events.",
    };
  } else {
    browserPixel = {
      state: "test-required",
      label: "Configured (Untested)",
      detail: "Pixel ID saved. Awaiting first verified browser event from storefront.",
    };
  }

  // 2. Conversions API (CAPI)
  let conversionsApi: IntegrationStatusDetail;
  if (!isEnabled) {
    conversionsApi = {
      state: "disconnected",
      label: "Tracking Paused",
      detail: "Master tracking is disabled. Server CAPI event delivery is suspended.",
    };
  } else if (!hasCapiToken) {
    conversionsApi = {
      state: "disconnected",
      label: "Token Required",
      detail: "Conversions API token not configured. Server events cannot be dispatched.",
    };
  } else if (hasServerDeliveryError) {
    conversionsApi = {
      state: "error",
      label: "Delivery Error",
      detail: lastServerEvent?.error || "Last server event failed delivery to Meta Graph API.",
    };
  } else if (hasDeliveredServerEvents) {
    conversionsApi = {
      state: "connected",
      label: "Connected & Verified",
      detail: "Meta Graph API successfully confirmed receipt of server-side events.",
    };
  } else {
    conversionsApi = {
      state: "test-required",
      label: "Configured (Test Required)",
      detail: "CAPI token saved. Send a test event to verify live connection with Meta.",
    };
  }

  // 3. Deduplication Engine
  let deduplication: IntegrationStatusDetail;
  if (browserPixel.state === "disconnected" || conversionsApi.state === "disconnected") {
    deduplication = {
      state: "disconnected",
      label: "Single Channel Only",
      detail: "Requires both Browser Pixel and Server CAPI to execute event deduplication.",
    };
  } else if (hasBrowserEvents && hasDeliveredServerEvents) {
    deduplication = {
      state: "connected",
      label: "Protected",
      detail: "Both channels active. Matching events paired via deterministic event_id.",
    };
  } else {
    deduplication = {
      state: "test-required",
      label: "Configured (Awaiting Pair)",
      detail: "Deduplication key format configured. Awaiting paired browser & server events.",
    };
  }

  // 4. Ad Account & Attribution
  let adAccount: IntegrationStatusDetail;
  if (!hasAdAccount || !hasMarketingToken) {
    adAccount = {
      state: "disconnected",
      label: "Not Connected",
      detail: "Ad Account ID or Marketing API token is missing.",
    };
  } else {
    adAccount = {
      state: "test-required",
      label: "Configured (Auth Req)",
      detail: "Credentials saved. Click 'Verify Ad Account Connection' to test Meta permissions.",
    };
  }

  // 5. Domain Verification
  let domainVerification: IntegrationStatusDetail;
  if (!hasDomainToken) {
    domainVerification = {
      state: "disconnected",
      label: "Unconfigured",
      detail: "Domain verification token not configured.",
    };
  } else if (settings.metaOwnershipVerified) {
    domainVerification = {
      state: "connected",
      label: "Ownership Verified",
      detail: `Verified in Meta Business Manager${settings.metaOwnershipVerifiedAt ? ` (${new Date(settings.metaOwnershipVerifiedAt).toLocaleDateString()})` : ""}.`,
    };
  } else {
    domainVerification = {
      state: "test-required",
      label: "Configured (Check Req)",
      detail: "Token configured. Run live DNS check to confirm status.",
    };
  }

  return {
    browserPixel,
    conversionsApi,
    deduplication,
    adAccount,
    domainVerification,
  };
}

/**
 * Strips raw secrets from the settings object before transmitting to browser UI,
 * and attaches computed truthful integration statuses.
 */
export function getPublicAdminPixelSettings(
  settings: PixelSettings,
  events: PixelEventRecord[] = []
): PublicAdminPixelSettings {
  const { capiAccessToken, marketingApiAccessToken, ...safe } = settings;
  const statuses = computeIntegrationStatuses(settings, events);

  return {
    ...safe,
    hasCapiAccessToken: Boolean(capiAccessToken?.trim()),
    maskedCapiAccessToken: maskSecret(capiAccessToken),
    hasMarketingApiAccessToken: Boolean(marketingApiAccessToken?.trim()),
    maskedMarketingApiAccessToken: maskSecret(marketingApiAccessToken),
    statuses,
  };
}

// Multi-tenant high-speed in-memory cache keyed by tenantId
const pixelSettingsCacheMap = new Map<string, { data: PixelSettings; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 1000; // 5 seconds maximum cache to ensure real-time toggle responsiveness

export function invalidatePixelSettingsCache(tenantId?: string) {
  if (tenantId) {
    pixelSettingsCacheMap.delete(tenantId);
  } else {
    pixelSettingsCacheMap.clear();
  }
}

export function normalizePixelSettings(raw: unknown, tenantId = DEFAULT_TENANT_ID): PixelSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  let pixelId = "";
  if (typeof source.pixelId === "string") {
    pixelId = source.pixelId.trim();
  }
  const isMockPixel = /^dev_mock/i.test(pixelId);
  if ((!pixelId || isMockPixel) && process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID) {
    pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID.trim();
  }

  // Master tracking can only be active if a non-empty pixelId exists
  const enabled = pixelId
    ? typeof source.enabled === "boolean"
      ? source.enabled
      : Boolean(process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID)
    : false;

  let adAccountId = typeof source.adAccountId === "string" ? source.adAccountId.trim() : "";
  const isMockAdAccount = /mock/i.test(adAccountId);
  if ((!adAccountId || isMockAdAccount) && process.env.META_AD_ACCOUNT_ID) {
    adAccountId = process.env.META_AD_ACCOUNT_ID.trim();
  }
  if (adAccountId && !adAccountId.startsWith("act_") && /^\d+$/.test(adAccountId)) {
    adAccountId = `act_${adAccountId}`;
  }

  const resolvedTenant =
    typeof source.tenantId === "string" && source.tenantId.trim()
      ? source.tenantId.trim()
      : tenantId || DEFAULT_TENANT_ID;

  return {
    tenantId: resolvedTenant,
    enabled,
    pixelId,
    testEventCode: typeof source.testEventCode === "string" ? source.testEventCode.trim() : "",
    domainVerificationToken:
      typeof source.domainVerificationToken === "string" ? source.domainVerificationToken.trim() : "",
    domainVerificationMethod:
      source.domainVerificationMethod === "html_meta_tag" ? "html_meta_tag" : "dns_txt",
    metaOwnershipVerified: Boolean(source.metaOwnershipVerified),
    metaOwnershipVerifiedAt:
      typeof source.metaOwnershipVerifiedAt === "string" ? source.metaOwnershipVerifiedAt : undefined,
    metaOwnershipSource:
      typeof source.metaOwnershipSource === "string"
        ? (source.metaOwnershipSource as "meta_business_manager" | "manual_confirmation" | "meta_api")
        : undefined,
    metaOwnershipConfirmedBy:
      typeof source.metaOwnershipConfirmedBy === "string" ? source.metaOwnershipConfirmedBy : undefined,
    capiAccessToken:
      typeof source.capiAccessToken === "string" && source.capiAccessToken.trim()
        ? decryptTokenString(source.capiAccessToken.trim())
        : process.env.META_CAPI_ACCESS_TOKEN?.trim() || "",
    marketingApiAccessToken:
      typeof source.marketingApiAccessToken === "string" && source.marketingApiAccessToken.trim()
        ? decryptTokenString(source.marketingApiAccessToken.trim())
        : process.env.META_MARKETING_API_TOKEN?.trim() ||
          process.env.META_ACCESS_TOKEN?.trim() ||
          "",
    adAccountId,
    trackPageView: source.trackPageView !== false,
    trackViewContent: source.trackViewContent !== false,
    trackAddToCart: source.trackAddToCart !== false,
    trackInitiateCheckout: source.trackInitiateCheckout !== false,
    trackPurchase: source.trackPurchase !== false,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export async function getPixelSettings(
  tenantId = DEFAULT_TENANT_ID,
  bypassCache = false
): Promise<PixelSettings> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;
  const now = Date.now();

  if (!bypassCache) {
    const cached = pixelSettingsCacheMap.get(safeTenant);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }
  }

  try {
    await connectToDatabase();

    // Primary query: strictly scoped by tenantId and key (strict: false prevents Mongoose dev singleton drift)
    type SettingsDoc = { _id?: any; tenantId?: string; value?: unknown };
    let doc: SettingsDoc | null = (await Settings.findOne({ tenantId: safeTenant, key: PIXEL_SETTINGS_KEY }, null, { strict: false }).lean().catch(() => null)) as SettingsDoc | null;

    // Direct collection fallback if Mongoose model schema cache is stale
    if (!doc) {
      doc = await Settings.collection.findOne({ tenantId: safeTenant, key: PIXEL_SETTINGS_KEY }).catch(() => null);
    }

    // Fallback migration check: if not found by tenantId, check legacy un-scoped document
    if (!doc && safeTenant === DEFAULT_TENANT_ID) {
      doc = await Settings.findOne({
        key: PIXEL_SETTINGS_KEY,
        $or: [{ tenantId: safeTenant }, { tenantId: { $exists: false } }, { tenantId: null }],
      }, null, { strict: false }).lean().catch(() => null);

      if (!doc) {
        doc = await Settings.collection.findOne({
          key: PIXEL_SETTINGS_KEY,
          $or: [{ tenantId: safeTenant }, { tenantId: { $exists: false } }, { tenantId: null }],
        }).catch(() => null);
      }

      // Backfill immediately if found un-scoped
      if (doc && !doc.tenantId) {
        await Settings.collection.updateOne(
          { _id: doc._id },
          { $set: { tenantId: DEFAULT_TENANT_ID } }
        ).catch(() => {});
      }
    }

    if (doc?.value) {
      const normalized = normalizePixelSettings(doc.value, safeTenant);
      if (normalized.pixelId) {
        pixelSettingsCacheMap.set(safeTenant, { data: normalized, expiresAt: now + CACHE_TTL_MS });
        return normalized;
      }
    }

    // Secondary fallback: find any configured pixel settings document in the database
    const configuredDoc = (await Settings.findOne({
      key: PIXEL_SETTINGS_KEY,
      "value.pixelId": { $exists: true, $ne: "" },
    }, null, { strict: false }).lean().catch(() => null)) as SettingsDoc | null;

    if (configuredDoc?.value) {
      const normalized = normalizePixelSettings(configuredDoc.value, safeTenant);
      pixelSettingsCacheMap.set(safeTenant, { data: normalized, expiresAt: now + CACHE_TTL_MS });
      return normalized;
    }

    if (doc?.value) {
      const normalized = normalizePixelSettings(doc.value, safeTenant);
      pixelSettingsCacheMap.set(safeTenant, { data: normalized, expiresAt: now + CACHE_TTL_MS });
      return normalized;
    }
  } catch (error) {
    console.warn("Pixel settings unavailable in DB, using fallback defaults:", error);
    const cachedFallback = pixelSettingsCacheMap.get(safeTenant);
    if (cachedFallback) return cachedFallback.data;
  }

  const fallback = { ...DEFAULT_PIXEL_SETTINGS, tenantId: safeTenant };
  pixelSettingsCacheMap.set(safeTenant, { data: fallback, expiresAt: now + CACHE_TTL_MS });
  return fallback;
}

export async function savePixelSettings(
  settings: Partial<PixelSettings>,
  tenantId = DEFAULT_TENANT_ID
): Promise<PixelSettings> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;
  await connectToDatabase();

  const current = await getPixelSettings(safeTenant);

  // Preserve existing secrets if masked placeholders are sent back
  let finalCapiToken = current.capiAccessToken || "";
  if (typeof settings.capiAccessToken === "string") {
    const raw = settings.capiAccessToken.trim();
    if (!raw.includes("••••") && !raw.includes("***")) {
      finalCapiToken = raw;
    }
  }

  let finalMarketingToken = current.marketingApiAccessToken || "";
  if (typeof settings.marketingApiAccessToken === "string") {
    const raw = settings.marketingApiAccessToken.trim();
    if (!raw.includes("••••") && !raw.includes("***")) {
      finalMarketingToken = raw;
    }
  }

  // Allow explicit clearing of pixelId (disconnection)
  const nextPixelId =
    settings.pixelId !== undefined ? settings.pixelId.trim() : (current.pixelId || "");

  // If pixelId is empty or being cleared, tracking MUST be disabled.
  // Otherwise respect explicit enabled flag if provided, else retain current.enabled.
  let nextEnabled = false;
  if (nextPixelId) {
    nextEnabled =
      settings.enabled !== undefined ? Boolean(settings.enabled) : Boolean(current.enabled);
  }

  const normalized = normalizePixelSettings(
    {
      ...current,
      ...settings,
      pixelId: nextPixelId,
      enabled: nextEnabled,
      capiAccessToken: finalCapiToken,
      marketingApiAccessToken: finalMarketingToken,
      tenantId: safeTenant,
      updatedAt: new Date().toISOString(),
    },
    safeTenant
  );

  // Encrypt sensitive Meta access tokens at rest before persisting to MongoDB
  const dbPayload = {
    ...normalized,
    capiAccessToken: encryptTokenString(normalized.capiAccessToken),
    marketingApiAccessToken: encryptTokenString(normalized.marketingApiAccessToken),
  };

  // Store update strictly scoped to (tenantId, key) with resilient direct collection fallback
  try {
    await Settings.findOneAndUpdate(
      { tenantId: safeTenant, key: PIXEL_SETTINGS_KEY },
      { $set: { tenantId: safeTenant, key: PIXEL_SETTINGS_KEY, value: dbPayload } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, strict: false }
    );
  } catch (dbErr) {
    console.warn("[PixelSettings] Mongoose findOneAndUpdate failed, falling back to direct collection update:", dbErr);
    await Settings.collection.updateOne(
      { tenantId: safeTenant, key: PIXEL_SETTINGS_KEY },
      { $set: { tenantId: safeTenant, key: PIXEL_SETTINGS_KEY, value: dbPayload } },
      { upsert: true }
    );
  }

  invalidatePixelSettingsCache(safeTenant);
  return normalized;
}
