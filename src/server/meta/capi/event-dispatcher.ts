import crypto from "crypto";
import { MetaEventLog } from "@/models/MetaEventLog";
import { getAppEnvironment } from "@/server/env/app-environment";
import { normalizeMetaContentId, normalizeMetaContentIds } from "@/lib/meta-product-id";
import { getPixelSettings, DEFAULT_TENANT_ID } from "@/server/meta/pixel/pixel-settings";
import type { MetaCapiEventPayload, MetaCapiResponse } from "./types";
import { MAX_RETRY_ATTEMPTS } from "./types";
import { buildMetaUserData } from "./event-builder";
import { calculateBackoffMs, queueMetaEventInLedger } from "./queue";

const GRAPH_API_VERSION = "v22.0";

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
    if (event.eventName === "PageView") {
      // PageView is a standard non-monetary event: do not attach currency or value,
      // and do not send custom_data unless valid non-monetary parameters exist.
      const cleanCustomData: Record<string, unknown> = { ...event.customData };
      delete cleanCustomData.value;
      delete cleanCustomData.currency;
      if (Object.keys(cleanCustomData).length > 0) {
        dataPayload.custom_data = cleanCustomData;
      }
    } else {
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
  }

  const requestBody: Record<string, unknown> = {
    data: [dataPayload],
  };

  if (testCode) {
    requestBody.test_event_code = testCode;
  }

  const appEnv = getAppEnvironment();

  // Test mode: strictly mock without external network calls
  if (appEnv === "test") {
    return {
      ok: true,
      status: 200,
      data: { events_received: 1, test_mode: true },
      fbtraceId: `test_fbtrace_${Date.now()}`,
      isTransient: false,
    };
  }

  // Development & Preview: Suppress live events from production dataset unless test_event_code is provided
  if (appEnv !== "production" && !testCode && process.env.ENABLE_PRODUCTION_META_EVENTS !== "true") {
    return {
      ok: true,
      status: 200,
      data: { events_received: 1, mocked: true },
      fbtraceId: `mock_non_prod_${Date.now()}`,
      isTransient: false,
    };
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
      4000
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
              testEventCode: testEventCode || undefined,
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
              testEventCode: testEventCode || undefined,
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
            testEventCode: testEventCode || undefined,
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
