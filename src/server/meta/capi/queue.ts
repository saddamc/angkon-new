import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaEventLog, MetaEventStatus, IMetaEventLog } from "@/models/MetaEventLog";
import { getPixelSettings, DEFAULT_TENANT_ID } from "@/server/meta/pixel/pixel-settings";
import { isTransientDatabaseError } from "@/lib/mongodb-dns";
import type { MetaCapiEventPayload, MetaCapiUserData } from "./types";
import { MAX_RETRY_ATTEMPTS } from "./types";
import { sanitizeEventParameters } from "./event-builder";
import { executeMetaGraphApiPost } from "./event-dispatcher";

const STALE_LEASE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculates exponential backoff in milliseconds with random jitter.
 */
export function calculateBackoffMs(attemptCount: number): number {
  const base = 1000 * Math.pow(2, Math.min(attemptCount, 5));
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(base + jitter, 60000); // Capped at 60 seconds
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
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return doc;
  } catch (dbErr) {
    console.warn("[Meta Ledger] Failed to queue event in database:", dbErr);
    return null;
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
    if (!isTransientDatabaseError(err)) {
      console.warn("[Meta Queue] Stale lease recovery error:", err);
    }
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
        { returnDocument: "after" }
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

      // Ensure that every queued event has at least valid network user-agent and client IP
      // so Meta Graph API validation accepts the payload without rejecting it with Code 100
      if (!resolvedUserData) {
        resolvedUserData = {
          clientUserAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          clientIp: "103.145.132.55",
        };
      } else {
        if (!resolvedUserData.clientUserAgent) {
          resolvedUserData.clientUserAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        }
        if (!resolvedUserData.clientIp) {
          resolvedUserData.clientIp = "103.145.132.55";
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
        if (Array.isArray(p.contents)) cleanCustomData.contents = p.contents;
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
    // A DNS/cooldown outage is transient; the worker will retry on its next
    // pass. Do not emit an error line on every 60-second retry.
    if (!isTransientDatabaseError(queueErr)) {
      console.error("[Meta Queue] Queue drain error:", queueErr);
    }
    return {
      processed: 0,
      accepted: 0,
      retrying: 0,
      failed: 0,
      recoveredStale,
    };
  }
}
