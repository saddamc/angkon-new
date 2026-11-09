import {
  MetaGraphApiError,
  callMetaGraphApi,
} from "@/lib/integrations/meta/client";

/**
 * Meta-reported pixel event volumes.
 *
 * `dataset_quality` (used for EMQ) returns match quality only — Meta never
 * includes a fire count there. The documented source for counts is
 * `GET /{ads-pixel-id}/stats` with `aggregation=event_total_counts`, which
 * returns one `{ value, count }` per event name.
 *
 * Tokens without pixel-level access receive a `#100 Permission Denied` from
 * that edge. We classify it as `no-permission` so the UI can say "Permission
 * required" instead of implying Meta has no traffic.
 */

export type MetaVolumeFailureReason =
  | "not-configured"
  | "unauthorized"
  | "no-permission"
  | "rate-limited"
  | "upstream-error";

export interface MetaVolumeReport {
  datasetId: string;
  /** Event name → pixel-fire count, exactly as Meta reports it. */
  volumes: Record<string, number>;
  /** Window Meta echoed back, ISO strings. Null when it omits them. */
  startTime: string | null;
  endTime: string | null;
  fetchedAt: string;
}

export type MetaVolumeResult =
  | { ok: true; report: MetaVolumeReport }
  | { ok: false; reason: MetaVolumeFailureReason; message: string };

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isObject(value)) return [value];
  return [];
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Normalises Meta's `AdsPixelStatsResult` payload.
 *
 * Documented shape:
 * `{ data: [{ aggregation, data: [{ value, count }], start_time, end_time }] }`
 * Older versions returned a flat list, so both are tolerated.
 */
export function normalisePixelStats(payload: unknown): {
  volumes: Record<string, number>;
  startTime: string | null;
  endTime: string | null;
} {
  const root = isObject(payload) ? payload : {};
  const entries = asArray(root.data ?? payload);
  const volumes: Record<string, number> = {};
  let startTime: string | null = null;
  let endTime: string | null = null;

  for (const entry of entries) {
    if (!isObject(entry)) continue;
    startTime ??= readString(entry.start_time);
    endTime ??= readString(entry.end_time);

    const items = Array.isArray(entry.data) ? entry.data : [entry];
    for (const item of items) {
      if (!isObject(item)) continue;
      const name =
        readString(item.value) ?? readString(item.event_name) ?? readString(item.event);
      const count = readNumber(item.count) ?? readNumber(item.total);
      if (!name || count === null) continue;
      volumes[name] = (volumes[name] ?? 0) + count;
    }
  }

  return { volumes, startTime, endTime };
}

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: MetaVolumeResult }>();

/** Coarse, secret-free classification of a Graph API failure. */
function classifyError(error: unknown): {
  reason: MetaVolumeFailureReason;
  message: string;
} {
  if (error instanceof MetaGraphApiError) {
    const text = `${error.message} ${error.errorType ?? ""}`.toLowerCase();
    // The stats edge reports permission problems as `#100 Permission Denied`.
    if (text.includes("permission") || error.code === 200 || error.code === 294) {
      return {
        reason: "no-permission",
        message:
          "The saved token cannot read pixel event volumes. Meta requires ads_read plus pixel-level access (or read_insights) for the stats edge.",
      };
    }
    if (error.category === "INVALID_TOKEN") {
      return {
        reason: "unauthorized",
        message: "The saved Meta access token is no longer valid.",
      };
    }
    if (error.category === "RATE_LIMITED") {
      return {
        reason: "rate-limited",
        message: "Meta is rate limiting pixel stats requests. Try again shortly.",
      };
    }
    return {
      reason: "upstream-error",
      message: "Meta could not return pixel event volumes right now.",
    };
  }

  return {
    reason: "upstream-error",
    message: "Pixel event volumes are unavailable right now.",
  };
}

/** True only for a rejected parameter — not for a permission denial. */
function isInvalidParameter(error: unknown): boolean {
  if (!(error instanceof MetaGraphApiError)) return false;
  if (error.code !== 100) return false;
  return /invalid parameter|param|aggregation|start_time|end_time/i.test(error.message) &&
    !/permission/i.test(error.message);
}

export interface FetchMetaVolumesOptions {
  datasetId: string;
  /** Ordered candidate tokens; the first that Meta accepts wins. */
  accessToken: string;
  /** Tried in order when `accessToken` is rejected or lacks permission. */
  fallbackAccessTokens?: string[];
  /** Requested look-back window in days. Defaults to 28 (page window). */
  days?: number;
  /** Injected for tests. */
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  now?: Date;
  /** Skip the in-process cache (tests). */
  noCache?: boolean;
}

async function requestVolumes(
  datasetId: string,
  accessToken: string,
  days: number,
  options: FetchMetaVolumesOptions
): Promise<MetaVolumeReport> {
  const end = options.now ?? new Date();
  let spanDays = days;

  for (let attempt = 0; attempt < 2; attempt++) {
    const start = new Date(end.getTime() - spanDays * 86_400_000);
    try {
      const response = await callMetaGraphApi<unknown>(`${datasetId}/stats`, {
        accessToken,
        params: {
          aggregation: "event_total_counts",
          start_time: Math.floor(start.getTime() / 1000),
          end_time: Math.floor(end.getTime() / 1000),
        },
        timeoutMs: options.timeoutMs ?? 15_000,
        maxRetries: 1,
        fetchFn: options.fetchFn,
      });

      const normalised = normalisePixelStats(response.data);
      return {
        datasetId,
        volumes: normalised.volumes,
        startTime: normalised.startTime ?? start.toISOString(),
        endTime: normalised.endTime ?? end.toISOString(),
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Retry once with the documented seven-day history limit when Meta
      // rejects the wider window.
      const retryWithWeek = attempt === 0 && spanDays > 7 && isInvalidParameter(error);
      if (!retryWithWeek) throw error;
      spanDays = 7;
    }
  }

  throw new Error("Meta stats request exhausted its retries.");
}

/**
 * Fetches pixel event volumes for one dataset. Results are cached briefly so
 * the page's 60-second poll does not hammer the Graph API.
 */
export async function fetchMetaEventVolumes(
  options: FetchMetaVolumesOptions
): Promise<MetaVolumeResult> {
  const datasetId = options.datasetId.trim();
  const days = Math.max(1, Math.min(options.days ?? 28, 90));
  const tokens = [
    options.accessToken.trim(),
    ...(options.fallbackAccessTokens || []).map((token) => token.trim()),
  ].filter(Boolean);

  if (!datasetId || !tokens.length) {
    return {
      ok: false,
      reason: "not-configured",
      message:
        "Connect a Meta pixel and save an access token to see Meta-reported event volumes.",
    };
  }

  const cacheKey = `${datasetId}:${days}`;
  if (!options.noCache) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  }

  let lastFailure: MetaVolumeResult = {
    ok: false,
    reason: "not-configured",
    message:
      "Connect a Meta pixel and save an access token to see Meta-reported event volumes.",
  };

  for (const [index, token] of tokens.entries()) {
    try {
      const report = await requestVolumes(datasetId, token, days, options);
      const value: MetaVolumeResult = { ok: true, report };
      if (!options.noCache) cache.set(cacheKey, { at: Date.now(), value });
      return value;
    } catch (error) {
      const classified = classifyError(error);
      console.warn(
        `[Meta Volumes] stats failed for token ${index + 1} of ${tokens.length} (${classified.reason}):`,
        error instanceof Error ? error.message : error
      );
      lastFailure = { ok: false, ...classified };

      if (
        classified.reason !== "unauthorized" &&
        classified.reason !== "no-permission"
      ) {
        break;
      }
    }
  }

  return lastFailure;
}
