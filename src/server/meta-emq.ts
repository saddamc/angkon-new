import {
  MetaGraphApiError,
  callMetaGraphApi,
} from "@/lib/integrations/meta/client";

/**
 * Event Match Quality (EMQ) reporting.
 *
 * Wraps Meta's Dataset Quality API (`GET /dataset_quality`) and normalises the
 * response into the shape the Events Manager UI renders: a headline score, a
 * per-event breakdown, per-match-key coverage with concrete fix suggestions,
 * and Meta's own diagnostics (which already include a `solution` string).
 *
 * Every parser here is defensive. Meta adds and retires fields between API
 * versions, and a missing optional key must degrade to "unknown", never to a
 * thrown error that takes the whole page down.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Normalised types
 * ────────────────────────────────────────────────────────────────────────── */

export interface EmqMatchKey {
  /** Meta's identifier, e.g. `em`, `ph`, `external_id`. */
  identifier: string;
  /** Human label, e.g. "Email address". */
  label: string;
  /** 0..1 coverage of events carrying this key. Null when Meta omits it. */
  coverage: number | null;
}

export interface EmqDiagnostic {
  name: string;
  description: string;
  /** Meta's own recommended fix. */
  solution: string;
  /** 0..1 share of affected events. */
  percentage: number | null;
  affectedEventCount: number | null;
  totalEventCount: number | null;
}

export interface EmqEvent {
  eventName: string;
  /** 0..10 composite match quality score for this event. */
  score: number | null;
  matchKeys: EmqMatchKey[];
  diagnostics: EmqDiagnostic[];
  /** 0..1 share of events Meta could attribute to this event name. */
  coverage: number | null;
  /** Machine value Meta reports (e.g. REAL_TIME), shown verbatim. */
  freshness: string | null;
  spend: number | null;
  /** Extra Meta-reported values we surface without interpreting. */
  extras: Record<string, string>;
}

export interface EmqReport {
  datasetId: string;
  /** Mean of per-event scores, 0..10. Null when no event carries a score. */
  compositeScore: number | null;
  events: EmqEvent[];
  /** Aggregate match-key coverage across every event that reports it. */
  matchKeys: EmqMatchKey[];
  /** Actionable items: Meta diagnostics first, then derived suggestions. */
  suggestions: string[];
  fetchedAt: string;
}

export type EmqFailureReason =
  | "not-configured"
  | "unauthorized"
  | "no-permission"
  | "not-found"
  | "rate-limited"
  | "upstream-error";

export type EmqFetchResult =
  | { ok: true; report: EmqReport }
  | { ok: false; reason: EmqFailureReason; message: string };

/* ──────────────────────────────────────────────────────────────────────────
 * Match-key vocabulary
 * ────────────────────────────────────────────────────────────────────────── */

const MATCH_KEY_LABELS: Record<string, string> = {
  em: "Email address",
  email: "Email address",
  ph: "Phone number",
  phone: "Phone number",
  fn: "First name",
  ln: "Last name",
  ct: "City",
  st: "State / province",
  zp: "ZIP / postal code",
  country: "Country",
  db: "Date of birth",
  ge: "Gender",
  external_id: "External ID",
  subscription_id: "Subscription ID",
  lead_id: "Lead ID",
  fb_login_id: "Facebook login ID",
  anonymous_ip: "Anonymous IP",
  client_ip_address: "Client IP address",
  ip_address: "Client IP address",
  client_user_agent: "Client user agent",
  user_agent: "Client user agent",
  fbc: "Click ID (fbc)",
  fbp: "Browser ID (fbp)",
  predicted_ltv: "Predicted lifetime value",
  status: "Subscription status",
  lead_source: "Lead source",
  information: "Contact information",
};

/** Fix guidance for the keys most responsible for a weak score. */
const MATCH_KEY_ADVICE: Record<string, string> = {
  em: "Send the lowercased, SHA-256 hashed email address with every event, ideally at page load as well as at conversion.",
  ph: "Send the phone number in international format (+880…) and hash it before sending.",
  fn: "Send the first name, trimmed and lowercased, then hash it.",
  ln: "Send the last name, trimmed and lowercased, then hash it.",
  ct: "Send the city name exactly as Meta expects it (lowercase, no abbreviations).",
  st: "Send the full state or province name rather than an abbreviation.",
  zp: "Send the ZIP / postal code so Meta can match on location.",
  country: "Send the two-letter country code (e.g. bd).",
  db: "Send the date of birth as YYYYMMDD.",
  ge: "Send the gender value Meta accepts (m / f).",
  external_id: "Send a stable customer or order identifier so returning visitors match across sessions.",
  fbc: "Forward the `_fbc` cookie value so click-through conversions are attributed correctly.",
  fbp: "Forward the `_fbp` cookie value so Meta can identify the browser.",
  client_ip_address: "Forward the real client IP address from the original request, not your server's outbound IP.",
  client_user_agent: "Forward the original browser user-agent string from the original request.",
  subscription_id: "Send a stable subscription identifier for recurring purchases.",
  lead_id: "Send the lead form identifier so lead events deduplicate correctly.",
};

function matchKeyLabel(identifier: string): string {
  return MATCH_KEY_LABELS[identifier.toLowerCase()] || identifier;
}

function matchKeyAdvice(identifier: string): string {
  return (
    MATCH_KEY_ADVICE[identifier.toLowerCase()] ||
    `Send the "${identifier}" value with every event so Meta can match more of your traffic.`
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Tolerant readers — Meta's payload shape varies between versions
 * ────────────────────────────────────────────────────────────────────────── */

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isObject(value)) return [value];
  return [];
}

/** Reads `value` as a finite number, or null. */
function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Reads a 0..1 ratio. Meta sometimes reports whole percentages (0-100). */
function readRatio(value: unknown): number | null {
  const parsed = readNumber(value);
  if (parsed === null) return null;
  const normalised = parsed > 1 ? parsed / 100 : parsed;
  if (!Number.isFinite(normalised)) return null;
  return Math.max(0, Math.min(1, normalised));
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** Picks the first non-null numeric reading across several candidate paths. */
function readFirstNumber(sources: unknown[]): number | null {
  for (const source of sources) {
    const value = readNumber(source);
    if (value !== null) return value;
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Field selection
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Nested field selector for the Dataset Quality API. Requesting a subset keeps
 * the payload small and stable; if Meta rejects a field name the caller falls
 * back to the unfiltered response.
 */
const EMQ_FIELDS =
  "web{event_name,event_match_quality{composite_score,match_key_feedback{identifier,coverage{percentage}}}," +
  "event_coverage,dedupe_key_feedback,data_freshness,event_spend,value_diagnostics,event_delay}";

/* ──────────────────────────────────────────────────────────────────────────
 * Normalisation
 * ────────────────────────────────────────────────────────────────────────── */

function normaliseMatchKeys(raw: unknown): EmqMatchKey[] {
  return asArray(raw)
    .filter(isObject)
    .map((entry) => {
      const identifier =
        readString(entry.identifier) || readString(entry.key) || readString(entry.name);
      if (!identifier) return null;

      // `coverage` may be `{ percentage }`, a bare number, or nested once more.
      const coverageSource = isObject(entry.coverage)
        ? (entry.coverage.percentage ?? entry.coverage.coverage ?? entry.coverage.value)
        : entry.coverage;

      return {
        identifier,
        label: matchKeyLabel(identifier),
        coverage: readRatio(coverageSource),
      } satisfies EmqMatchKey;
    })
    .filter((key): key is EmqMatchKey => key !== null);
}

function normaliseDiagnostics(raw: unknown): EmqDiagnostic[] {
  return asArray(raw)
    .filter(isObject)
    .map((entry) => ({
      name: readString(entry.name) || readString(entry.title) || "Diagnostic",
      description: readString(entry.description) || readString(entry.detail) || "",
      solution: readString(entry.solution) || readString(entry.recommendation) || "",
      percentage: readRatio(entry.percentage ?? entry.rate),
      affectedEventCount: readFirstNumber([
        entry.affected_event_count,
        entry.affected_events,
      ]),
      totalEventCount: readFirstNumber([
        entry.total_event_count,
        entry.total_events,
      ]),
    }));
}

function normaliseEvent(raw: unknown): EmqEvent | null {
  if (!isObject(raw)) return null;

  const eventName = readString(raw.event_name) || readString(raw.name);
  if (!eventName) return null;

  // `event_match_quality` arrives as an object in some versions and as a
  // single-element array in others; the score lives in either.
  const matchQuality = asArray(raw.event_match_quality).filter(isObject);
  const scores = matchQuality
    .map((entry) => readNumber(entry.composite_score ?? entry.score))
    .filter((score): score is number => score !== null);

  const matchKeys = matchKeysFromQuality(matchQuality, raw);

  const diagnostics = normaliseDiagnostics(
    raw.diagnostics ?? raw.event_diagnostics ?? raw.quality_diagnostics
  );

  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      [
        "event_name",
        "name",
        "event_match_quality",
        "diagnostics",
        "event_coverage",
        "match_key_feedback",
      ].includes(key)
    ) {
      continue;
    }
    const text = readString(value);
    if (text !== null && text.length <= 120) extras[key] = text;
  }

  return {
    eventName,
    score: scores.length ? scores[0] : null,
    matchKeys,
    diagnostics,
    coverage: readRatio(
      isObject(raw.event_coverage)
        ? (raw.event_coverage.percentage ?? raw.event_coverage.coverage)
        : raw.event_coverage
    ),
    freshness: readString(
      isObject(raw.data_freshness)
        ? (raw.data_freshness.value ?? raw.data_freshness.status)
        : raw.data_freshness
    ),
    spend: readFirstNumber([raw.event_spend, raw.spend]),
    extras,
  };
}

/** Match keys may sit on the quality object or directly on the event. */
function matchKeysFromQuality(matchQuality: Raw[], raw: Raw): EmqMatchKey[] {
  for (const entry of matchQuality) {
    const keys = normaliseMatchKeys(
      entry.match_key_feedback ?? entry.match_keys ?? entry.keys
    );
    if (keys.length) return keys;
  }
  return normaliseMatchKeys(raw.match_key_feedback ?? raw.match_keys);
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Round a 0..1 ratio to a whole percentage for display. */
function toPercent(ratio: number | null): number | null {
  if (ratio === null) return null;
  return Math.round(ratio * 100);
}

/**
 * Builds the ordered, de-duplicated action list shown under the score:
 * Meta's own diagnostics first (they carry an official `solution`), then
 * derived advice for match keys whose coverage is weak.
 */
function buildSuggestions(events: EmqEvent[]): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  const push = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(trimmed);
  };

  for (const event of events) {
    for (const diagnostic of event.diagnostics) {
      push(diagnostic.solution || diagnostic.description);
    }
  }

  // Worst coverage across events decides which keys get advice first.
  const worstCoverage = new Map<string, number>();
  for (const event of events) {
    for (const key of event.matchKeys) {
      if (key.coverage === null) continue;
      const current = worstCoverage.get(key.identifier);
      if (current === undefined || key.coverage < current) {
        worstCoverage.set(key.identifier, key.coverage);
      }
    }
  }

  const weakKeys = [...worstCoverage.entries()]
    .filter(([, coverage]) => coverage < 0.7)
    .sort((a, b) => a[1] - b[1]);

  for (const [identifier, coverage] of weakKeys) {
    const percent = toPercent(coverage) ?? 0;
    push(`${matchKeyLabel(identifier)} reaches only ${percent}% of events — ${matchKeyAdvice(identifier)}`);
  }

  return suggestions;
}

/**
 * Normalises the raw `dataset_quality` payload into an `EmqReport`.
 * Exported separately so tests can exercise it without network access.
 */
export function normaliseDatasetQuality(
  payload: unknown,
  datasetId: string
): EmqReport {
  const root = isObject(payload) ? payload : {};

  // The dataset list lives under `web`; tolerate a bare object too.
  const webEntries = asArray(root.web ?? root.data ?? payload).filter(isObject);

  const events = webEntries
    .map(normaliseEvent)
    .filter((event): event is EmqEvent => event !== null);

  const scores = events
    .map((event) => event.score)
    .filter((score): score is number => score !== null);

  // Aggregate match keys: keep the worst coverage per identifier so the
  // headline panel never overstates how well a key is doing.
  const aggregate = new Map<string, EmqMatchKey>();
  for (const event of events) {
    for (const key of event.matchKeys) {
      const existing = aggregate.get(key.identifier);
      if (!existing) {
        aggregate.set(key.identifier, { ...key });
        continue;
      }
      if (key.coverage !== null && (existing.coverage === null || key.coverage < existing.coverage)) {
        aggregate.set(key.identifier, { ...key });
      }
    }
  }

  return {
    datasetId,
    compositeScore: mean(scores),
    events,
    matchKeys: [...aggregate.values()].sort(
      (a, b) => (a.coverage ?? 1) - (b.coverage ?? 1)
    ),
    suggestions: buildSuggestions(events),
    fetchedAt: new Date().toISOString(),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Fetching
 * ────────────────────────────────────────────────────────────────────────── */

export interface FetchEmqOptions {
  datasetId: string;
  /** Ordered candidate tokens; the first that Meta accepts wins. */
  accessToken: string;
  /** Tried in order when `accessToken` is rejected or lacks permission. */
  fallbackAccessTokens?: string[];
  /** Injected for tests. */
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

/** Coarse, secret-free classification of a Graph API failure. */
function classifyError(error: unknown): {
  reason: EmqFailureReason;
  message: string;
} {
  if (error instanceof MetaGraphApiError) {
    switch (error.category) {
      case "INVALID_TOKEN":
        return {
          reason: "unauthorized",
          message: "The saved Meta access token is no longer valid.",
        };
      case "MISSING_PERMISSIONS":
        return {
          reason: "no-permission",
          message:
            "The token lacks the ads_read plus ads_management or business_management permissions required for dataset quality.",
        };
      case "RESOURCE_NOT_FOUND":
        return {
          reason: "not-found",
          message: "Meta could not find this events dataset with the saved credentials.",
        };
      case "RATE_LIMITED":
        return {
          reason: "rate-limited",
          message: "Meta is rate limiting dataset quality requests. Try again shortly.",
        };
      default:
        return {
          reason: "upstream-error",
          message: "Meta could not return dataset quality data right now.",
        };
    }
  }

  return {
    reason: "upstream-error",
    message: "Event match quality data is unavailable right now.",
  };
}

/** True when Meta rejected our field selector rather than the request itself. */
function isFieldSelectionError(error: unknown): boolean {
  if (!(error instanceof MetaGraphApiError)) return false;
  if (error.code !== 100 && error.code !== 10) return false;
  return /field|unknown|undefined/i.test(error.message);
}

/**
 * Fetches and normalises Event Match Quality for one dataset.
 *
 * Requires a token with `ads_read` plus `ads_management` or
 * `business_management`, and "Use events dataset" partial access when the
 * token is scoped to an ad account.
 */
export async function fetchEventMatchQuality(
  options: FetchEmqOptions
): Promise<EmqFetchResult> {
  const datasetId = options.datasetId.trim();
  const tokens = [
    options.accessToken.trim(),
    ...(options.fallbackAccessTokens || []).map((token) => token.trim()),
  ].filter(Boolean);

  if (!datasetId || !tokens.length) {
    return {
      ok: false,
      reason: "not-configured",
      message: "Connect a Meta pixel and save an access token to see match quality.",
    };
  }

  let lastFailure: EmqFetchResult = {
    ok: false,
    reason: "not-configured",
    message: "Connect a Meta pixel and save an access token to see match quality.",
  };

  for (const [index, token] of tokens.entries()) {
    try {
      const report = await requestDatasetQuality(datasetId, token, options);

      if (!report.events.length) {
        lastFailure = {
          ok: false,
          reason: "not-found",
          message:
            "Meta returned no events for this dataset yet. Events usually appear within a few hours of the first pixel fire.",
        };
        continue;
      }

      return { ok: true, report };
    } catch (error) {
      const classified = classifyError(error);
      // Keep server logs useful but free of tokens (the Graph client already
      // redacts them; we log only the classification).
      console.warn(
        `[Meta EMQ] dataset_quality failed for token ${index + 1} of ${tokens.length} (${classified.reason}):`,
        error instanceof Error ? error.message : error
      );
      lastFailure = { ok: false, ...classified };

      // A missing-permission or invalid-token failure is worth retrying with
      // the next token; rate limits and outages are not.
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

/** Performs one dataset_quality request and normalises the payload. */
async function requestDatasetQuality(
  datasetId: string,
  accessToken: string,
  options: FetchEmqOptions
): Promise<EmqReport> {
  let response;
  try {
    response = await callMetaGraphApi<unknown>("dataset_quality", {
      accessToken,
      params: { dataset_id: datasetId, fields: EMQ_FIELDS },
      timeoutMs: options.timeoutMs ?? 15_000,
      maxRetries: 1,
      fetchFn: options.fetchFn,
    });
  } catch (error) {
    // A retired field name must not break the page — retry once unfiltered.
    if (!isFieldSelectionError(error)) throw error;
    response = await callMetaGraphApi<unknown>("dataset_quality", {
      accessToken,
      params: { dataset_id: datasetId, fields: "web" },
      timeoutMs: options.timeoutMs ?? 15_000,
      maxRetries: 1,
      fetchFn: options.fetchFn,
    });
  }

  return normaliseDatasetQuality(response.data, datasetId);
}

/**
 * Ordered candidate tokens for dataset quality. Marketing API tokens are
 * preferred; the CAPI dataset token is next because many system-user tokens
 * carry both scopes. The caller tries them in order.
 */
export function resolveEmqTokens(settings: {
  marketingApiAccessToken?: string;
  capiAccessToken?: string;
}): { primary: string; fallbacks: string[]; source: "marketing" | "capi" | null } {
  const marketing = settings.marketingApiAccessToken?.trim() || "";
  const capi = settings.capiAccessToken?.trim() || "";

  if (marketing) {
    return {
      primary: marketing,
      fallbacks: capi && capi !== marketing ? [capi] : [],
      source: "marketing",
    };
  }
  if (capi) return { primary: capi, fallbacks: [], source: "capi" };

  return { primary: "", fallbacks: [], source: null };
}
