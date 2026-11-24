/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { MetaEventLog } from "@/models/MetaEventLog";
import { DEFAULT_TENANT_ID } from "@/server/auth/tenant";
import { sanitizeTelemetryUrl, sanitizeTelemetryParameters } from "./telemetry";

export interface PixelEventRecord {
  id: string;
  tenantId?: string;
  timestamp: string;
  name: string;
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
    | "retrying"
    | "silenced";
  error?: string;
  fbtraceId?: string;
  matchQuality?: number;
  attemptCount?: number;
  nextAttemptAt?: string;
}

const MAX_EVENT_LOGS = 200;

declare global {
  // eslint-disable-next-line no-var
  var __angkon_pixel_events_buffer: PixelEventRecord[] | undefined;
}

function getGlobalBuffer(): PixelEventRecord[] {
  if (!global.__angkon_pixel_events_buffer) {
    global.__angkon_pixel_events_buffer = [];
  }
  return global.__angkon_pixel_events_buffer;
}

export function recordPixelEvent(event: {
  name: string;
  url?: string;
  parameters?: Record<string, unknown>;
  source?: "browser" | "server" | "test_simulator";
  testEventCode?: string;
  eventId?: string;
  status?: "dispatched" | "delivered" | "failed" | "accepted" | "retrying" | "queued" | "silenced";
  error?: string;
  fbtraceId?: string;
  matchQuality?: number;
  tenantId?: string;
}): PixelEventRecord {
  const buffer = getGlobalBuffer();
  const eventId = event.eventId || (event.parameters?.eventId as string) || undefined;
  const status = event.status || "dispatched";

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
 * Loads real persistent telemetry records from MongoDB MetaEventLog.
 * Reconciles deduplication matching between browser and server events.
 * Strictly separates production telemetry from test simulation events to prevent analytics pollution.
 */
export async function getDurablePixelEvents(
  tenantId = DEFAULT_TENANT_ID,
  limit = 200,
  since?: Date
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
  /**
   * Per-event browser/server split across the whole production ledger. The
   * recent-events sample is capped at `limit`, so it must never be used to
   * infer an event's delivery mix.
   */
  eventChannelStats: Record<string, { browser: number; server: number }>;
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

    // When a window is requested, every aggregate below is scoped to it so the
    // header's date preset matches the numbers on screen.
    if (since instanceof Date && Number.isFinite(since.getTime())) {
      productionMatch.createdAt = { $gte: since };
      testMatch.createdAt = { $gte: since };
    }

    const [
      aggregateCounts,
      aggregateTotal,
      statusCounts,
      channelCounts,
      eventChannelCounts,
      dedupGroups,
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
      MetaEventLog.aggregate([
        { $match: productionMatch },
        {
          $group: {
            _id: { event: "$eventName", source: "$source" },
            count: { $sum: 1 },
          },
        },
      ]),
      // Deduplication must cover the whole ledger, not the 200-row sample.
      MetaEventLog.aggregate([
        {
          $match: {
            ...productionMatch,
            eventId: { $exists: true, $nin: [null, ""] },
          },
        },
        {
          $group: {
            _id: "$eventId",
            sources: { $addToSet: "$source" },
          },
        },
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

    // Per-event delivery mix, computed from the whole production ledger.
    const eventChannelStats: Record<string, { browser: number; server: number }> = {};
    for (const item of eventChannelCounts) {
      const eventName =
        item && item._id && typeof item._id.event === "string" ? item._id.event : null;
      const source = item && item._id && typeof item._id.source === "string" ? item._id.source : null;
      if (!eventName || !source) continue;
      const entry = eventChannelStats[eventName] ?? { browser: 0, server: 0 };
      if (source === "browser") entry.browser += item.count || 0;
      else if (source === "server") entry.server += item.count || 0;
      eventChannelStats[eventName] = entry;
    }

    // Deduplication evidence across every eventId in the ledger.
    let pairedCount = 0;
    let browserOnlyCount = 0;
    let serverOnlyCount = 0;

    for (const group of dedupGroups) {
      const sources = new Set<string>(Array.isArray(group.sources) ? group.sources : []);
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
      eventChannelStats,
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
      eventChannelStats: {},
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
