import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaEventLog, MetaEventStatus, IMetaEventLog } from "@/models/MetaEventLog";
import { getPixelSettings, DEFAULT_TENANT_ID } from "./pixel-settings";
import { normalizeMetaContentId, normalizeMetaContentIds } from "@/lib/meta-product-id";

const GRAPH_API_VERSION = "v22.0";
export const MAX_RETRY_ATTEMPTS = 5;
const STALE_LEASE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Computes standard SHA-256 hash for customer data parameter normalization.
 * Meta CAPI requires lowercased, trimmed strings before hashing.
 */
export function hashSha256(value?: string): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash("sha256").update(clean).digest("hex");
}

/**
 * Normalizes phone numbers according to E.164 / Meta recommendation.
 * Automatically handles Bangladesh mobile numbers (e.g. 0171... -> 880171...).
 */
export function normalizeAndHashPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  // Strip all non-numeric characters
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;

  // If local Bangladesh number starting with 01 (11 digits), prepend country code 880
  if (digits.startsWith("01") && digits.length === 11) {
    digits = `880${digits.slice(1)}`;
  } else if (digits.startsWith("1") && digits.length === 10) {
    digits = `880${digits}`;
  }

  return crypto.createHash("sha256").update(digits).digest("hex");
}

export interface MetaCapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  country?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaCapiCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: (string | number)[];
  content_type?: string;
  contents?: Array<{ id: string | number; quantity: number; item_price?: number }>;
  order_id?: string | number;
  num_items?: number;
  status?: string;
  [key: string]: unknown;
}

export interface MetaCapiEventPayload {
  eventName: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | string;
  eventId: string; // Critical for browser/server deduplication
  eventTime?: number; // Unix seconds
  eventSourceUrl?: string;
  actionSource?: "website" | "app" | "physical_store" | "system_generated";
  userData?: MetaCapiUserData;
  customData?: MetaCapiCustomData;
  testEventCode?: string;
  tenantId?: string;
}

export interface MetaCapiResponse {
  success: boolean;
  status: MetaEventStatus;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
  code?: number;
  logId?: string;
}

/**
 * Builds standard Meta Conversions API user_data object.
 * Strictly hashes PII (email, phone, name, city, zip, country) while
 * preserving IP address, User-Agent, and cookies in plaintext per Meta spec.
 */
export function buildMetaUserData(userData?: MetaCapiUserData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
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

  // IP, User-Agent, and Cookies MUST remain plaintext (never hashed)
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

/**
 * Calculates exponential backoff in milliseconds with random jitter.
 */
export function calculateBackoffMs(attemptCount: number): number {
  const base = 1000 * Math.pow(2, Math.min(attemptCount, 5));
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(base + jitter, 60000); // Capped at 60 seconds
}

/**
 * Creates safe, sanitized parameters for persistence in MetaEventLog.
 * Never stores raw credentials, raw emails, raw phone numbers, or complete card details.
 */
function sanitizeEventParameters(event: MetaCapiEventPayload): Record<string, unknown> {
  const params: Record<string, unknown> = {
    eventId: event.eventId,
    actionSource: event.actionSource || "website",
    hasEmail: Boolean(event.userData?.email),
    hasPhone: Boolean(event.userData?.phone),
    hasFbp: Boolean(event.userData?.fbp),
    hasFbc: Boolean(event.userData?.fbc),
  };

  if (event.customData) {
    if (event.customData.value !== undefined) params.value = event.customData.value;
    if (event.customData.currency) params.currency = event.customData.currency;
    if (event.customData.order_id) params.order_id = event.customData.order_id;
    if (event.customData.num_items !== undefined) params.num_items = event.customData.num_items;
    if (event.customData.content_type) params.content_type = event.customData.content_type;
    if (event.customData.content_name) params.content_name = event.customData.content_name;
    if (Array.isArray(event.customData.content_ids)) {
      params.content_ids = normalizeMetaContentIds(event.customData.content_ids).slice(0, 10);
    }
  }

  return params;
}

/**
 * Persists an event into the durable MongoDB MetaEventLog.
 * Uses atomic upsert by (tenantId, eventId, source) so retrying or re-emitting
 * the same logical event updates the existing record without collision.
 */
export async function queueMetaEventInLedger(
  event: MetaCapiEventPayload,
  source: "server" | "browser" | "test_simulator" = "server",
  tenantId = DEFAULT_TENANT_ID
): Promise<IMetaEventLog | null> {
  try {
    await connectToDatabase();

    const safeTenant = tenantId || DEFAULT_TENANT_ID;
    const eventTime = event.eventTime || Math.floor(Date.now() / 1000);
    const orderId =
      event.customData?.order_id !== undefined ? String(event.customData.order_id) : undefined;

    const sanitizedParams = sanitizeEventParameters(event);

    const doc = await MetaEventLog.findOneAndUpdate(
      { tenantId: safeTenant, eventId: event.eventId, source },
      {
        $setOnInsert: {
          tenantId: safeTenant,
          eventName: event.eventName,
          eventId: event.eventId,
          source,
          status: "queued" as MetaEventStatus,
          eventTime,
          url: event.eventSourceUrl || "/",
          parameters: sanitizedParams,
          testEventCode: event.testEventCode || undefined,
          orderId,
          attemptCount: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return doc;
  } catch (dbErr) {
    console.warn("[Meta Ledger] Failed to queue event in database:", dbErr);
    return null;
  }
}

/**
 * Executes direct HTTP transmission to Meta Graph API Conversions API endpoint.
 * Handles timeouts, network retries, and permanent vs transient response classification.
 */
export async function executeMetaGraphApiPost(
  pixelId: string,
  capiToken: string,
  event: MetaCapiEventPayload,
  timeoutMs = 5000
): Promise<{
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
  error?: string;
  errorCode?: number;
  fbtraceId?: string;
  isTransient: boolean;
}> {
  const eventTime = event.eventTime || Math.floor(Date.now() / 1000);
  const testCode = event.testEventCode || undefined;

  const dataPayload: Record<string, unknown> = {
    event_name: event.eventName,
    event_time: eventTime,
    event_id: event.eventId,
    event_source_url:
      event.eventSourceUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://www.angkon.net",
    action_source: event.actionSource || "website",
    user_data: buildMetaUserData(event.userData),
  };

  if (event.customData) {
    const normalizedCustomData: Record<string, unknown> = { ...event.customData };

    if (Array.isArray(normalizedCustomData.content_ids)) {
      normalizedCustomData.content_ids = normalizeMetaContentIds(
        normalizedCustomData.content_ids
      );
    }

    if (Array.isArray(normalizedCustomData.contents)) {
      normalizedCustomData.contents = (
        normalizedCustomData.contents as Array<Record<string, unknown>>
      ).map((content) => ({
        ...content,
        id: normalizeMetaContentId(content.id) ?? content.id,
      }));
    }

    dataPayload.custom_data = {
      currency: event.customData.currency || "BDT",
      value: event.customData.value ?? 0,
      ...normalizedCustomData,
    };
  }

  const requestBody: Record<string, unknown> = {
    data: [dataPayload],
  };

  if (testCode) {
    requestBody.test_event_code = testCode;
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(
    pixelId
  )}/events?access_token=${encodeURIComponent(capiToken)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const resJson = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const errObj = resJson?.error as
      | { message?: string; code?: number; fbtrace_id?: string; error_subcode?: number }
      | undefined;

    const fbtraceId =
      (typeof resJson?.fbtrace_id === "string" ? resJson.fbtrace_id : undefined) ||
      errObj?.fbtrace_id;

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data: resJson,
        fbtraceId,
        isTransient: false,
      };
    }

    // Classify error: HTTP 429 or 5xx are transient; HTTP 400, 401, 403 are permanent
    const isTransient = response.status === 429 || response.status >= 500;
    const errMsg =
      errObj?.message || `Meta Graph API error (HTTP ${response.status})`;

    return {
      ok: false,
      status: response.status,
      data: resJson,
      error: errMsg,
      errorCode: errObj?.code,
      fbtraceId,
      isTransient,
    };
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const isTimeout =
      fetchErr instanceof Error && (fetchErr.name === "AbortError" || fetchErr.message.includes("aborted"));
    const errMsg = isTimeout
      ? `Meta API request timed out after ${timeoutMs}ms`
      : fetchErr instanceof Error
      ? fetchErr.message
      : "Network error reaching Meta API";

    return {
      ok: false,
      status: isTimeout ? 408 : 0,
      data: {},
      error: errMsg,
      isTransient: true, // Network failures are retryable
    };
  }
}

/**
 * Sends a server-side event directly to Meta Conversions API (CAPI) with durable ledger state.
 *
 * Execution flow:
 * 1. Inserts event into MetaEventLog as 'queued'.
 * 2. Attempts immediate bounded HTTP transmission to Meta.
 * 3. On success: marks status as 'accepted'.
 * 4. On transient failure (5xx, 429, timeout): schedules exponential backoff and marks 'retrying'.
 * 5. On permanent failure (400, 401, 403, missing credentials): marks 'failed' with sanitized error.
 * 6. Never throws or halts checkout/order completion.
 */
export async function sendMetaCapiEvent(
  event: MetaCapiEventPayload,
  explicitToken?: string,
  explicitPixelId?: string,
  tenantId = DEFAULT_TENANT_ID
): Promise<MetaCapiResponse> {
  const safeTenant = tenantId || DEFAULT_TENANT_ID;

  // 1. Ensure event is recorded in durable ledger as 'queued'
  const logDoc = await queueMetaEventInLedger(event, "server", safeTenant);
  const logId = logDoc?._id ? String(logDoc._id) : undefined;

  try {
    // bypassCache: true to guarantee real-time enforcement of admin settings changes
    const settings = await getPixelSettings(safeTenant, true);
    const pixelId = explicitPixelId?.trim() || settings.pixelId?.trim();
    const capiToken = explicitToken?.trim() || settings.capiAccessToken?.trim();

    // Check store settings configuration
    if (!settings.enabled && !explicitToken) {
      if (logDoc) {
        await MetaEventLog.updateOne(
          { _id: logDoc._id },
          { $set: { status: "silenced", error: "Meta tracking is disabled in store settings" } }
        ).catch(() => {});
      }
      return {
        success: false,
        status: "silenced",
        error: "Meta tracking is disabled in store settings.",
        logId,
      };
    }

    // Check individual event trigger toggles
    const isEventDisabled =
      (event.eventName === "PageView" && settings.trackPageView === false) ||
      (event.eventName === "ViewContent" && settings.trackViewContent === false) ||
      (event.eventName === "AddToCart" && settings.trackAddToCart === false) ||
      (event.eventName === "InitiateCheckout" && settings.trackInitiateCheckout === false) ||
      (event.eventName === "Purchase" && settings.trackPurchase === false);

    if (isEventDisabled && !explicitToken) {
      if (logDoc) {
        await MetaEventLog.updateOne(
          { _id: logDoc._id },
          { $set: { status: "silenced", error: `Event ${event.eventName} disabled in store settings` } }
        ).catch(() => {});
      }
      return {
        success: true,
        status: "silenced",
        error: `Event ${event.eventName} disabled in store settings.`,
        logId,
      };
    }

    if (!pixelId) {
      if (logDoc) {
        await MetaEventLog.updateOne(
          { _id: logDoc._id },
          { $set: { status: "failed", error: "Pixel Dataset ID not configured" } }
        ).catch(() => {});
      }
      return {
        success: false,
        status: "failed",
        error: "Meta Pixel / Dataset ID is not configured.",
        logId,
      };
    }

    if (!capiToken) {
      if (logDoc) {
        await MetaEventLog.updateOne(
          { _id: logDoc._id },
          { $set: { status: "failed", error: "CAPI access token missing" } }
        ).catch(() => {});
      }
      return {
        success: false,
        status: "failed",
        error: "Meta Conversions API access token is not configured in settings.",
        logId,
      };
    }

    // Mark as 'processing' with a claim token
    const claimToken = crypto.randomUUID();
    if (logDoc) {
      await MetaEventLog.updateOne(
        { _id: logDoc._id },
        {
          $set: {
            status: "processing",
            claimToken,
            claimedAt: new Date(),
          },
          $inc: { attemptCount: 1 },
        }
      ).catch(() => {});
    }

    const testEventCode = event.testEventCode || settings.testEventCode || undefined;
    const transmission = await executeMetaGraphApiPost(
      pixelId,
      capiToken,
      { ...event, testEventCode },
      8000
    );

    if (transmission.ok) {
      const received =
        typeof transmission.data.events_received === "number"
          ? transmission.data.events_received
          : 1;

      if (logDoc) {
        await MetaEventLog.updateOne(
          { _id: logDoc._id },
          {
            $set: {
              status: "accepted",
              responseStatus: transmission.status,
              eventsReceived: received,
              fbtraceId: transmission.fbtraceId,
              claimToken: null,
              claimedAt: null,
              error: null,
            },
          }
        ).catch(() => {});
      }

      return {
        success: true,
        status: "accepted",
        eventsReceived: received,
        fbtraceId: transmission.fbtraceId,
        logId,
      };
    }

    // Transmission was rejected or encountered an error
    const attempt = (logDoc?.attemptCount || 0) + 1;

    if (transmission.isTransient && attempt < MAX_RETRY_ATTEMPTS) {
      const backoffMs = calculateBackoffMs(attempt);
      const nextAttemptAt = new Date(Date.now() + backoffMs);

      if (logDoc) {
        await MetaEventLog.updateOne(
          { _id: logDoc._id },
          {
            $set: {
              status: "retrying",
              responseStatus: transmission.status,
              error: transmission.error,
              errorCode: transmission.errorCode,
              fbtraceId: transmission.fbtraceId,
              nextAttemptAt,
              claimToken: null,
              claimedAt: null,
            },
          }
        ).catch(() => {});
      }

      return {
        success: false,
        status: "retrying",
        error: transmission.error,
        code: transmission.errorCode,
        fbtraceId: transmission.fbtraceId,
        logId,
      };
    }

    // Permanent failure or max attempts exhausted
    const finalError =
      attempt >= MAX_RETRY_ATTEMPTS
        ? `Exceeded maximum retry attempts (${MAX_RETRY_ATTEMPTS}). Last error: ${transmission.error}`
        : transmission.error;

    if (logDoc) {
      await MetaEventLog.updateOne(
        { _id: logDoc._id },
        {
          $set: {
            status: "failed",
            responseStatus: transmission.status,
            error: finalError,
            errorCode: transmission.errorCode,
            fbtraceId: transmission.fbtraceId,
            claimToken: null,
            claimedAt: null,
          },
        }
      ).catch(() => {});
    }

    return {
      success: false,
      status: "failed",
      error: finalError,
      code: transmission.errorCode,
      fbtraceId: transmission.fbtraceId,
      logId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fatal error during CAPI dispatch";
    console.error("[Meta CAPI] Dispatch exception:", message);

    if (logDoc) {
      await MetaEventLog.updateOne(
        { _id: logDoc._id },
        {
          $set: {
            status: "failed",
            error: message,
            claimToken: null,
            claimedAt: null,
          },
        }
      ).catch(() => {});
    }

    return {
      success: false,
      status: "failed",
      error: message,
      logId,
    };
  }
}

/**
 * Recovers stale processing jobs whose worker lease has expired (stuck > 5 minutes).
 */
export async function recoverStaleProcessingJobs(tenantId = DEFAULT_TENANT_ID): Promise<number> {
  try {
    await connectToDatabase();
    const staleCutoff = new Date(Date.now() - STALE_LEASE_MS);

    const result = await MetaEventLog.updateMany(
      {
        tenantId,
        status: "processing",
        claimedAt: { $lt: staleCutoff },
      },
      {
        $set: {
          status: "retrying",
          claimToken: null,
          claimedAt: null,
          nextAttemptAt: new Date(),
        },
      }
    );

    return result.modifiedCount || 0;
  } catch (err) {
    console.warn("[Meta Queue] Stale lease recovery error:", err);
    return 0;
  }
}

/**
 * Drains and retries queued/retrying events from the ledger using bounded concurrent leases.
 */
export async function drainMetaCapiQueue(
  tenantId = DEFAULT_TENANT_ID,
  batchLimit = 10
): Promise<{
  processed: number;
  accepted: number;
  retrying: number;
  failed: number;
  recoveredStale: number;
}> {
  const safeTenant = tenantId || DEFAULT_TENANT_ID;
  const recoveredStale = await recoverStaleProcessingJobs(safeTenant);

  try {
    await connectToDatabase();
    const settings = await getPixelSettings(safeTenant);

    // If master tracking is paused or unconfigured, halt queue worker without transmitting or modifying events
    if (!settings.enabled || !settings.pixelId?.trim()) {
      return {
        processed: 0,
        accepted: 0,
        retrying: 0,
        failed: 0,
        recoveredStale,
      };
    }

    const now = new Date();

    const pendingLogs = await MetaEventLog.find({
      tenantId: safeTenant,
      source: "server",
      status: { $in: ["queued", "retrying"] },
      $or: [{ nextAttemptAt: { $lte: now } }, { nextAttemptAt: null }, { nextAttemptAt: { $exists: false } }],
    })
      .sort({ createdAt: 1 })
      .limit(batchLimit);

    let accepted = 0;
    let retrying = 0;
    let failed = 0;

    for (const log of pendingLogs) {
      // Durable claim attempt: only process if not claimed by another worker
      const claimToken = crypto.randomUUID();
      const claimedDoc = await MetaEventLog.findOneAndUpdate(
        {
          _id: log._id,
          status: { $in: ["queued", "retrying"] },
        },
        {
          $set: {
            status: "processing",
            claimToken,
            claimedAt: new Date(),
          },
          $inc: { attemptCount: 1 },
        },
        { new: true }
      );

      if (!claimedDoc) continue; // Claimed by another worker

      let resolvedUserData: MetaCapiUserData | undefined = undefined;
      if (claimedDoc.orderId) {
        try {
          const { Order } = await import("@/models/Order");
          const order = await Order.findOne({ orderNumber: claimedDoc.orderId }).lean();
          if (order?.customer) {
            resolvedUserData = {
              email: order.customer.email,
              phone: order.customer.phone,
              firstName: order.customer.fullName,
              city: order.customer.city,
              district: order.customer.district,
              postalCode: order.customer.postalCode,
            };
          }
        } catch {
          // ignore order lookup errors in queue processor
        }
      }

      // Filter out internal telemetry boolean flags from customData
      const cleanCustomData: Record<string, unknown> = {};
      if (claimedDoc.parameters && typeof claimedDoc.parameters === "object") {
        const p = claimedDoc.parameters as Record<string, unknown>;
        if (typeof p.value === "number") cleanCustomData.value = p.value;
        if (typeof p.currency === "string") cleanCustomData.currency = p.currency;
        if (p.order_id) cleanCustomData.order_id = p.order_id;
        if (typeof p.num_items === "number") cleanCustomData.num_items = p.num_items;
        if (typeof p.content_type === "string") cleanCustomData.content_type = p.content_type;
        if (typeof p.content_name === "string") cleanCustomData.content_name = p.content_name;
        if (Array.isArray(p.content_ids)) cleanCustomData.content_ids = p.content_ids;
      }

      const eventPayload: MetaCapiEventPayload = {
        eventName: claimedDoc.eventName,
        eventId: claimedDoc.eventId,
        eventTime: claimedDoc.eventTime,
        eventSourceUrl: claimedDoc.url,
        actionSource: "website",
        userData: resolvedUserData,
        customData: cleanCustomData,
        testEventCode: claimedDoc.testEventCode || settings.testEventCode,
      };

      const pixelId = settings.pixelId?.trim();
      const capiToken = settings.capiAccessToken?.trim();

      if (!settings.enabled || !pixelId || !capiToken) {
        await MetaEventLog.updateOne(
          { _id: claimedDoc._id },
          {
            $set: {
              status: "failed",
              error: "Settings missing or tracking disabled",
              claimToken: null,
              claimedAt: null,
            },
          }
        );
        failed++;
        continue;
      }

      // Check if this event type was silenced by store administrator
      const isEventDisabled =
        (claimedDoc.eventName === "PageView" && settings.trackPageView === false) ||
        (claimedDoc.eventName === "ViewContent" && settings.trackViewContent === false) ||
        (claimedDoc.eventName === "AddToCart" && settings.trackAddToCart === false) ||
        (claimedDoc.eventName === "InitiateCheckout" && settings.trackInitiateCheckout === false) ||
        (claimedDoc.eventName === "Purchase" && settings.trackPurchase === false);

      if (isEventDisabled) {
        await MetaEventLog.updateOne(
          { _id: claimedDoc._id },
          {
            $set: {
              status: "silenced",
              error: `Event ${claimedDoc.eventName} disabled in store settings`,
              claimToken: null,
              claimedAt: null,
            },
          }
        );
        continue;
      }

      const transmission = await executeMetaGraphApiPost(
        pixelId,
        capiToken,
        eventPayload,
        8000
      );

      if (transmission.ok) {
        await MetaEventLog.updateOne(
          { _id: claimedDoc._id },
          {
            $set: {
              status: "accepted",
              responseStatus: transmission.status,
              eventsReceived:
                typeof transmission.data.events_received === "number"
                  ? transmission.data.events_received
                  : 1,
              fbtraceId: transmission.fbtraceId,
              claimToken: null,
              claimedAt: null,
              error: null,
            },
          }
        );
        accepted++;
      } else if (transmission.isTransient && claimedDoc.attemptCount < MAX_RETRY_ATTEMPTS) {
        const backoffMs = calculateBackoffMs(claimedDoc.attemptCount);
        await MetaEventLog.updateOne(
          { _id: claimedDoc._id },
          {
            $set: {
              status: "retrying",
              responseStatus: transmission.status,
              error: transmission.error,
              errorCode: transmission.errorCode,
              fbtraceId: transmission.fbtraceId,
              nextAttemptAt: new Date(Date.now() + backoffMs),
              claimToken: null,
              claimedAt: null,
            },
          }
        );
        retrying++;
      } else {
        await MetaEventLog.updateOne(
          { _id: claimedDoc._id },
          {
            $set: {
              status: "failed",
              responseStatus: transmission.status,
              error: transmission.error || "Retry limit reached",
              errorCode: transmission.errorCode,
              fbtraceId: transmission.fbtraceId,
              claimToken: null,
              claimedAt: null,
            },
          }
        );
        failed++;
      }
    }

    return {
      processed: pendingLogs.length,
      accepted,
      retrying,
      failed,
      recoveredStale,
    };
  } catch (queueErr) {
    console.error("[Meta Queue] Queue drain error:", queueErr);
    return {
      processed: 0,
      accepted: 0,
      retrying: 0,
      failed: 0,
      recoveredStale,
    };
  }
}

/**
 * Diagnostic test runner for validating Conversions API credentials live against Meta.
 */
export async function testMetaCapiConnection(
  pixelId: string,
  capiToken: string,
  testEventCode?: string,
  tenantId = DEFAULT_TENANT_ID,
  options?: {
    eventName?: string;
    eventId?: string;
    eventSourceUrl?: string;
    customData?: Record<string, unknown>;
  }
): Promise<MetaCapiResponse> {
  const testEventId = options?.eventId || `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return sendMetaCapiEvent(
    {
      eventName: options?.eventName || "PageView",
      eventId: testEventId,
      eventSourceUrl:
        options?.eventSourceUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://www.angkon.net"}/admin/meta/pixel`,
      actionSource: "website",
      userData: {
        clientIp: "103.145.12.44",
        clientUserAgent: "ANGKON Diagnostic Agent/1.0",
      },
      customData: {
        diagnostic_test: true,
        ...(options?.customData || {}),
      },
      testEventCode,
    },
    capiToken,
    pixelId,
    tenantId
  );
}
