import { redactTokens } from "@/lib/security/token-encryption";

export const DEFAULT_META_GRAPH_VERSION = "v22.0";
export const META_GRAPH_BASE_URL = "https://graph.facebook.com";

export type MetaErrorCategory =
  | "INVALID_TOKEN"
  | "MISSING_PERMISSIONS"
  | "RATE_LIMITED"
  | "RESOURCE_NOT_FOUND"
  | "TRANSIENT"
  | "UNKNOWN";

export interface MetaGraphApiUsageInfo {
  callCountPct?: number;
  totalTimePct?: number;
  totalCpuTimePct?: number;
  estimatedTimeToRegainAccess?: number;
}

export interface MetaGraphApiRawError {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
}

export class MetaGraphApiError extends Error {
  public status: number;
  public code: number;
  public errorSubcode?: number;
  public errorType?: string;
  public fbtraceId?: string;
  public category: MetaErrorCategory;
  public isRateLimit: boolean;
  public isFatal: boolean;
  public regainAccessMinutes?: number;

  constructor(status: number, raw: MetaGraphApiRawError, regainMinutes?: number) {
    const rawMsg = raw.message || `Meta Graph API returned HTTP ${status}`;
    super(redactTokens(rawMsg));
    this.name = "MetaGraphApiError";
    this.status = status;
    this.code = raw.code || status;
    this.errorSubcode = raw.error_subcode;
    this.errorType = raw.type;
    this.fbtraceId = raw.fbtrace_id;
    this.regainAccessMinutes = regainMinutes;

    // Rate limits
    this.isRateLimit =
      this.code === 80000 ||
      this.code === 80004 ||
      this.code === 17 ||
      this.code === 32 ||
      this.errorSubcode === 2446079 ||
      status === 429;

    // Categorization
    if (this.code === 190 || this.code === 102) {
      this.category = "INVALID_TOKEN";
      this.isFatal = true;
    } else if (this.code === 200 || this.code === 294) {
      this.category = "MISSING_PERMISSIONS";
      this.isFatal = true;
    } else if (this.code === 100 || this.code === 803) {
      this.category = "RESOURCE_NOT_FOUND";
      this.isFatal = true;
    } else if (this.isRateLimit) {
      this.category = "RATE_LIMITED";
      this.isFatal = false;
    } else if (status >= 500) {
      this.category = "TRANSIENT";
      this.isFatal = false;
    } else {
      this.category = "UNKNOWN";
      this.isFatal = status < 500 && status !== 429;
    }
  }
}

export interface MetaGraphApiRequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PATCH";
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  accessToken: string;
  apiVersion?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
}

export interface MetaGraphApiResponse<T> {
  data: T;
  status: number;
  usage?: MetaGraphApiUsageInfo;
  headers: Headers;
}

function parseUsageHeaders(headers: Headers): MetaGraphApiUsageInfo | undefined {
  const usageHeader =
    headers.get("x-business-use-case-usage") ||
    headers.get("x-ad-account-usage") ||
    headers.get("x-app-usage");

  if (!usageHeader) return undefined;

  try {
    const parsed = JSON.parse(usageHeader);
    let target = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
    if (Array.isArray(target)) {
      target = target[0];
    }
    if (target && typeof target === "object") {
      const t = target as Record<string, number>;
      return {
        callCountPct: t.call_count,
        totalTimePct: t.total_time,
        totalCpuTimePct: t.total_cputime,
        estimatedTimeToRegainAccess: t.estimated_time_to_regain_access,
      };
    }
  } catch {
    // Ignore header parse failures
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resilient, secure client for Meta Graph API calls.
 */
export async function callMetaGraphApi<T>(
  endpointPath: string,
  options: MetaGraphApiRequestOptions
): Promise<MetaGraphApiResponse<T>> {
  const method = options.method || "GET";
  const apiVersion =
    options.apiVersion || process.env.META_GRAPH_API_VERSION || DEFAULT_META_GRAPH_VERSION;
  const timeoutMs = options.timeoutMs || 15_000;
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
  const fetchClient = options.fetchFn || fetch;

  const cleanPath = endpointPath.startsWith("/") ? endpointPath.slice(1) : endpointPath;
  const url = new URL(`${META_GRAPH_BASE_URL}/${apiVersion}/${cleanPath}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let attempt = 0;
  let delay = 1000;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${options.accessToken.trim()}`,
      };

      let bodyPayload: string | undefined;
      if (options.body && method !== "GET") {
        headers["Content-Type"] = "application/json";
        bodyPayload = JSON.stringify(options.body);
      }

      const response = await fetchClient(url.toString(), {
        method,
        headers,
        body: bodyPayload,
        signal: controller.signal,
        cache: "no-store",
      });

      const usage = parseUsageHeaders(response.headers);
      const json = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          data: json as T,
          status: response.status,
          usage,
          headers: response.headers,
        };
      }

      const rawError = (json?.error || {}) as MetaGraphApiRawError;
      const apiError = new MetaGraphApiError(
        response.status,
        rawError,
        usage?.estimatedTimeToRegainAccess
      );

      // If error is fatal or we exhausted retries, throw immediately
      if (apiError.isFatal || attempt > maxRetries) {
        throw apiError;
      }

      // Exponential backoff with jitter for transient errors
      const jitter = Math.floor(Math.random() * 300);
      const waitTime = delay + jitter;
      console.warn(
        `[Meta Graph API] Retrying transient error (${apiError.code}) in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`
      );
      await sleep(waitTime);
      delay *= 2;
    } catch (err) {
      if (err instanceof MetaGraphApiError) {
        throw err;
      }

      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("abort"));

      if (attempt > maxRetries) {
        if (isAbort) {
          throw new MetaGraphApiError(504, {
            message: `Meta Graph API request timed out after ${timeoutMs}ms.`,
            code: 504,
          });
        }
        throw new MetaGraphApiError(500, {
          message: err instanceof Error ? err.message : "Network error contacting Meta Graph API.",
          code: 500,
        });
      }

      const jitter = Math.floor(Math.random() * 300);
      await sleep(delay + jitter);
      delay *= 2;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new MetaGraphApiError(500, {
    message: "Meta Graph API exceeded maximum retry attempts.",
    code: 500,
  });
}
