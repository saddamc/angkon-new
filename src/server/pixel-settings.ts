/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { DEFAULT_TENANT_ID } from "./tenant";
import {
  encryptTokenString,
  decryptTokenString,
  maskSecret as maskSecretSecure,
} from "@/lib/security/token-encryption";

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
  enabled: false,
  pixelId: "",
  testEventCode: "",
  domainVerificationToken: "",
  domainVerificationMethod: "dns_txt",
  metaOwnershipVerified: false,
  metaOwnershipVerifiedAt: "",
  metaOwnershipSource: "meta_business_manager",
  metaOwnershipConfirmedBy: "",
  capiAccessToken: "",
  marketingApiAccessToken: "",
  adAccountId: "",
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
      typeof source.capiAccessToken === "string"
        ? decryptTokenString(source.capiAccessToken.trim())
        : "",
    marketingApiAccessToken:
      typeof source.marketingApiAccessToken === "string"
        ? decryptTokenString(source.marketingApiAccessToken.trim())
        : "",
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

/* ──────────────────────────────────────────────────────────────────────────
 * Meta Events Manager Telemetry & Rolling Live Event Stream
 * ────────────────────────────────────────────────────────────────────────── */

import { MetaEventLog } from "@/models/MetaEventLog";

export interface PixelEventRecord {
  id: string;
  tenantId?: string;
  name: string;
  timestamp: string;
  url: string;
  parameters: Record<string, unknown>;
  source: "browser" | "server" | "test_simulator";
  testEventCode?: string;
  eventId?: string;
  status?:
    | "delivered"
    | "dispatched"
    | "failed"
    | "queued"
    | "processing"
    | "sent"
    | "accepted"
    | "retrying";
  error?: string;
  fbtraceId?: string;
  matchQuality?: number;
  attemptCount?: number;
  nextAttemptAt?: string;
}

declare global {
  var __angkon_pixel_events_buffer: PixelEventRecord[] | undefined;
}

const MAX_EVENT_LOGS = 100;

function getGlobalBuffer(): PixelEventRecord[] {
  if (!global.__angkon_pixel_events_buffer) {
    global.__angkon_pixel_events_buffer = [];
  }
  return global.__angkon_pixel_events_buffer;
}

export function recordPixelEvent(
  event: Omit<PixelEventRecord, "id" | "timestamp"> & { tenantId?: string }
): PixelEventRecord {
  const buffer = getGlobalBuffer();

  const eventId =
    event.eventId ||
    (typeof event.parameters?.eventId === "string"
      ? (event.parameters.eventId as string)
      : typeof event.parameters?.event_id === "string"
      ? (event.parameters.event_id as string)
      : typeof event.parameters?.order_id === "string"
      ? `order_${event.parameters.order_id}`
      : undefined);

  const status =
    event.status ||
    (event.source === "server"
      ? "accepted"
      : event.source === "test_simulator"
      ? "accepted"
      : "dispatched");

  const safeTenant = event.tenantId || DEFAULT_TENANT_ID;

  const record: PixelEventRecord = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tenantId: safeTenant,
    timestamp: new Date().toISOString(),
    name: event.name,
    url: event.url || "/",
    parameters: event.parameters || {},
    source: event.source || "browser",
    testEventCode: event.testEventCode || undefined,
    eventId,
    status,
    error: event.error,
    fbtraceId: event.fbtraceId,
    matchQuality: event.matchQuality,
  };

  buffer.unshift(record);
  if (buffer.length > MAX_EVENT_LOGS) {
    buffer.length = MAX_EVENT_LOGS;
  }

  // Asynchronously persist browser or simulator events into durable MetaEventLog
  if (eventId) {
    connectToDatabase()
      .then(() => {
        return MetaEventLog.findOneAndUpdate(
          { tenantId: safeTenant, eventId, source: record.source },
          {
            $set: {
              tenantId: safeTenant,
              eventName: record.name,
              eventId,
              source: record.source,
              status: record.status === "failed" ? "failed" : "accepted",
              eventTime: Math.floor(Date.now() / 1000),
              url: record.url,
              parameters: record.parameters,
              testEventCode: record.testEventCode,
              error: record.error,
              fbtraceId: record.fbtraceId,
            },
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      })
      .catch(() => {});
  }

  return record;
}

export function getPixelEvents(tenantId?: string): {
  events: PixelEventRecord[];
  stats: Record<string, number>;
} {
  const buffer = getGlobalBuffer();
  const safeTenant = tenantId?.trim();

  const filtered = safeTenant
    ? buffer.filter((ev) => !ev.tenantId || ev.tenantId === safeTenant)
    : buffer;

  const stats: Record<string, number> = {
    total: filtered.length,
    PageView: 0,
    ViewContent: 0,
    AddToCart: 0,
    InitiateCheckout: 0,
    Purchase: 0,
  };

  for (const ev of filtered) {
    if (stats[ev.name] !== undefined) {
      stats[ev.name]++;
    }
  }

  return { events: [...filtered], stats };
}

/**
 * Privacy sanitization for URLs in telemetry logs.
 * Redacts fbclid, tokens, session IDs, passwords, and sensitive query parameters.
 */
export function sanitizeTelemetryUrl(rawUrl?: string): string {
  if (!rawUrl) return "/";
  try {
    const dummyBase = "https://www.angkon.net";
    const isRelative = rawUrl.startsWith("/");
    const parsed = new URL(isRelative ? `${dummyBase}${rawUrl}` : rawUrl);
    const sensitiveKeys = [
      "fbclid",
      "token",
      "access_token",
      "capi_token",
      "key",
      "secret",
      "auth",
      "session_id",
      "session",
      "password",
      "pass",
      "email",
      "phone",
      "code",
    ];

    for (const key of Array.from(parsed.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (
        sensitiveKeys.some((s) => lower === s || lower.includes("token") || lower.includes("secret"))
      ) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }

    return isRelative ? `${parsed.pathname}${parsed.search}` : parsed.toString();
  } catch {
    return rawUrl.split("?")[0] || "/";
  }
}

/**
 * Sanitizes event parameters so raw emails, phone numbers, and secrets are never leaked in client responses.
 */
export function sanitizeTelemetryParameters(params?: Record<string, unknown>): Record<string, unknown> {
  if (!params || typeof params !== "object") return {};
  const safe: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(params)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("pass") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("auth")
    ) {
      safe[key] = "[REDACTED]";
    } else if (lower === "email" && typeof val === "string") {
      safe[key] = val.includes("@")
        ? `${val.slice(0, 2)}***@${val.split("@")[1]}`
        : "[REDACTED]";
    } else if (lower === "phone" && typeof val === "string") {
      safe[key] = val.length >= 6 ? `${val.slice(0, 4)}***${val.slice(-2)}` : "[REDACTED]";
    } else {
      safe[key] = val;
    }
  }

  return safe;
}

/**
 * Loads real persistent telemetry records from MongoDB MetaEventLog.
 * Reconciles deduplication matching between browser and server events.
 * Strictly separates production telemetry from test simulation events to prevent analytics pollution.
 */
export async function getDurablePixelEvents(
  tenantId = DEFAULT_TENANT_ID,
  limit = 200
): Promise<{
  events: PixelEventRecord[];
  stats: Record<string, number>;
  deliveryStats: {
    queued: number;
    processing: number;
    accepted: number;
    retrying: number;
    failed: number;
    deliverySuccessRate: number | null;
  };
  deduplicationStats: {
    pairedCount: number;
    browserOnlyCount: number;
    serverOnlyCount: number;
    dedupRate: number | null;
    totalUniqueEvents: number;
  };
  channelStats: {
    browserCount: number;
    serverCount: number;
    testCount: number;
    browserRatio: number | null;
    serverRatio: number | null;
  };
  testStats: Record<string, number>;
  testEvents: PixelEventRecord[];
}> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;

  try {
    await connectToDatabase();

    // Production filter: exclude test events and simulators
    const productionMatch: Record<string, any> = {
      tenantId: safeTenant,
      $and: [
        {
          $or: [
            { testEventCode: { $exists: false } },
            { testEventCode: null },
            { testEventCode: "" },
          ],
        },
        { source: { $ne: "test_simulator" } },
      ],
    };

    // Test filter: events with testEventCode or source === "test_simulator"
    const testMatch: Record<string, any> = {
      tenantId: safeTenant,
      $or: [
        { testEventCode: { $exists: true, $nin: [null, ""] } },
        { source: "test_simulator" },
      ],
    };

    const [
      aggregateCounts,
      aggregateTotal,
      statusCounts,
      channelCounts,
      docs,
      testDocs,
      testCounts,
    ] = await Promise.all([
      MetaEventLog.aggregate([
        { $match: productionMatch },
        { $group: { _id: "$eventName", count: { $sum: 1 } } },
      ]),
      MetaEventLog.countDocuments(productionMatch),
      MetaEventLog.aggregate([
        { $match: productionMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      MetaEventLog.aggregate([
        { $match: productionMatch },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
      MetaEventLog.find(productionMatch)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      MetaEventLog.find(testMatch)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      MetaEventLog.aggregate([
        { $match: testMatch },
        { $group: { _id: "$eventName", count: { $sum: 1 } } },
      ]),
    ]);

    const stats: Record<string, number> = {
      total: aggregateTotal,
      PageView: 0,
      ViewContent: 0,
      AddToCart: 0,
      InitiateCheckout: 0,
      Purchase: 0,
    };

    for (const item of aggregateCounts) {
      if (item._id && typeof item.count === "number") {
        stats[item._id] = item.count;
      }
    }

    // Delivery stats for CAPI
    const deliveryStats = {
      queued: 0,
      processing: 0,
      accepted: 0,
      retrying: 0,
      failed: 0,
      deliverySuccessRate: null as number | null,
    };

    for (const item of statusCounts) {
      if (item._id && deliveryStats[item._id as keyof typeof deliveryStats] !== undefined) {
        (deliveryStats as Record<string, unknown>)[item._id] = item.count;
      }
    }

    const totalCapiOutcomes = deliveryStats.accepted + deliveryStats.failed + deliveryStats.retrying;
    deliveryStats.deliverySuccessRate =
      totalCapiOutcomes > 0
        ? Math.round((deliveryStats.accepted / totalCapiOutcomes) * 100)
        : null;

    // Channel delivery breakdown
    let browserCount = 0;
    let serverCount = 0;
    for (const item of channelCounts) {
      if (item._id === "browser") browserCount = item.count;
      if (item._id === "server") serverCount = item.count;
    }
    const totalChannels = browserCount + serverCount;
    const channelStats = {
      browserCount,
      serverCount,
      testCount: testDocs.length,
      browserRatio: totalChannels > 0 ? Math.round((browserCount / totalChannels) * 100) : null,
      serverRatio: totalChannels > 0 ? Math.round((serverCount / totalChannels) * 100) : null,
    };

    // Index events by eventId to compute truthful deduplication evidence
    const eventIdMap = new Map<string, Set<string>>();
    for (const doc of docs as any[]) {
      if (doc.eventId) {
        if (!eventIdMap.has(doc.eventId)) {
          eventIdMap.set(doc.eventId, new Set());
        }
        eventIdMap.get(doc.eventId)!.add(doc.source);
      }
    }

    let pairedCount = 0;
    let browserOnlyCount = 0;
    let serverOnlyCount = 0;

    for (const [, sources] of eventIdMap) {
      if (sources.has("browser") && sources.has("server")) {
        pairedCount++;
      } else if (sources.has("browser")) {
        browserOnlyCount++;
      } else if (sources.has("server")) {
        serverOnlyCount++;
      }
    }

    const totalUniqueEvents = pairedCount + browserOnlyCount + serverOnlyCount;
    const dedupRate =
      totalUniqueEvents > 0 ? Math.round((pairedCount / totalUniqueEvents) * 100) : null;

    const mapDocToRecord = (doc: any): PixelEventRecord => ({
      id: String(doc._id),
      tenantId: doc.tenantId,
      name: doc.eventName,
      timestamp: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      url: sanitizeTelemetryUrl(doc.url),
      parameters: sanitizeTelemetryParameters(doc.parameters as Record<string, unknown>),
      source: doc.source,
      testEventCode: doc.testEventCode,
      eventId: doc.eventId,
      status: doc.status as PixelEventRecord["status"],
      error: doc.error,
      fbtraceId: doc.fbtraceId,
      attemptCount: doc.attemptCount,
      nextAttemptAt: doc.nextAttemptAt ? new Date(doc.nextAttemptAt).toISOString() : undefined,
    });

    const events: PixelEventRecord[] = docs.map(mapDocToRecord);
    const testEvents: PixelEventRecord[] = testDocs.map(mapDocToRecord);

    const testStats: Record<string, number> = {
      total: testDocs.length,
      PageView: 0,
      ViewContent: 0,
      AddToCart: 0,
      InitiateCheckout: 0,
      Purchase: 0,
    };

    for (const item of testCounts) {
      if (item._id && typeof item.count === "number") {
        testStats[item._id] = item.count;
      }
    }

    return {
      events,
      stats,
      deliveryStats,
      deduplicationStats: {
        pairedCount,
        browserOnlyCount,
        serverOnlyCount,
        dedupRate,
        totalUniqueEvents,
      },
      channelStats,
      testStats,
      testEvents,
    };
  } catch (err) {
    console.warn("[Meta Ledger] Database query error, using memory buffer:", err);
    const inMem = getPixelEvents(safeTenant);
    return {
      events: inMem.events,
      stats: inMem.stats,
      deliveryStats: {
        queued: 0,
        processing: 0,
        accepted: inMem.events.filter((e) => e.status === "delivered" || e.status === "accepted").length,
        retrying: 0,
        failed: inMem.events.filter((e) => e.status === "failed").length,
        deliverySuccessRate: null,
      },
      deduplicationStats: {
        pairedCount: 0,
        browserOnlyCount: inMem.events.filter((e) => e.source === "browser").length,
        serverOnlyCount: inMem.events.filter((e) => e.source === "server").length,
        dedupRate: null,
        totalUniqueEvents: inMem.events.length,
      },
      channelStats: {
        browserCount: inMem.events.filter((e) => e.source === "browser").length,
        serverCount: inMem.events.filter((e) => e.source === "server").length,
        testCount: inMem.events.filter((e) => e.source === "test_simulator").length,
        browserRatio: null,
        serverRatio: null,
      },
      testStats: {
        total: 0,
        PageView: 0,
        ViewContent: 0,
        AddToCart: 0,
        InitiateCheckout: 0,
        Purchase: 0,
      },
      testEvents: inMem.events.filter((e) => e.source === "test_simulator" || e.testEventCode),
    };
  }
}

export async function clearPixelEvents(tenantId?: string): Promise<void> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;

  if (global.__angkon_pixel_events_buffer) {
    global.__angkon_pixel_events_buffer = global.__angkon_pixel_events_buffer.filter(
      (ev) => ev.tenantId && ev.tenantId !== safeTenant
    );
  }

  try {
    await connectToDatabase();
    await MetaEventLog.deleteMany({ tenantId: safeTenant });
  } catch {
    /* ignore db deletion error */
  }
}
