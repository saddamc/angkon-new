import {
  getMetaMarketingSettings,
  updateMetaMarketingSettings,
  normalizeAdAccountId,
} from "@/server/meta/marketing/meta-marketing-settings";
import { DEFAULT_TENANT_ID } from "@/server/auth/tenant";
import type { MetaApiRateLimitInfo, MetaApiErrorDetails } from "./types";
import { deduplicateFields } from "./reporting";

export const META_MARKETING_API_VERSION = "v22.0";
const MAX_RETRIES = 3;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MetaMarketingApiError extends Error {
  code: number;
  errorSubcode?: number;
  fbtraceId?: string;
  isRateLimit: boolean;
  isFatal: boolean;
  regainAccessMinutes?: number;

  constructor(details: MetaApiErrorDetails, regainMinutes?: number) {
    super(`Meta Marketing API (${details.code}): ${details.message}`);
    this.name = "MetaMarketingApiError";
    this.code = details.code;
    this.errorSubcode = details.error_subcode;
    this.fbtraceId = details.fbtrace_id;
    this.regainAccessMinutes = regainMinutes;

    // Rate limits
    this.isRateLimit =
      details.code === 80000 ||
      details.code === 80004 ||
      details.code === 17 ||
      details.code === 32 ||
      details.error_subcode === 2446079;

    // Fatal non-retryable errors
    this.isFatal =
      details.code === 190 || // Invalid OAuth / expired token
      details.code === 100 || // Invalid parameter
      details.code === 200; // Permissions error
  }
}

/**
 * Parses usage headers returned by Meta Marketing API.
 */
function parseUsageHeaders(headers: Headers): MetaApiRateLimitInfo {
  const info: MetaApiRateLimitInfo = {};

  const usageHeader = headers.get("x-business-use-case-usage") || headers.get("x-ad-account-usage");
  if (usageHeader) {
    try {
      const parsed = JSON.parse(usageHeader);
      // Could be an object with account ids as keys, or array
      const target = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
      if (target && typeof target === "object") {
        const t = target as Record<string, number>;
        info.callCountPct = t.call_count;
        info.totalTimePct = t.total_time;
        info.totalCpuTimePct = t.total_cputime;
        info.estimatedTimeToRegainAccess = t.estimated_time_to_regain_access;
      }
    } catch {
      // Ignore header parse failures
    }
  }

  return info;
}

/**
 * Resilient Graph API execution with exponential backoff on transient errors
 * and rate-limit header inspection.
 */
export async function callMetaMarketingGraphApi<T>(
  endpoint: string,
  token: string
): Promise<{ data: T; rateLimitInfo: MetaApiRateLimitInfo }> {
  let attempt = 0;
  let delay = 1000;

  const url = endpoint.includes("?")
    ? `${endpoint}&access_token=${encodeURIComponent(token)}`
    : `${endpoint}?access_token=${encodeURIComponent(token)}`;

  while (attempt < MAX_RETRIES) {
    attempt++;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const rateLimitInfo = parseUsageHeaders(response.headers);
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      return { data: body as T, rateLimitInfo };
    }

    const err = (body?.error || {}) as MetaApiErrorDetails;
    const apiError = new MetaMarketingApiError(err, rateLimitInfo.estimatedTimeToRegainAccess);

    if (apiError.isFatal) {
      throw apiError;
    }

    // Rate-limit pauses (e.g. 80000 or 80004)
    if (apiError.isRateLimit && (err.code === 80000 || err.code === 80004)) {
      throw apiError; // Handled at job level to pause execution
    }

    // General transient rate limit or network glitch: back off
    if (attempt < MAX_RETRIES) {
      console.warn(`[Meta Marketing API] Backing off ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`);
      await wait(delay);
      delay *= 2;
      continue;
    }

    throw apiError;
  }

  throw new Error("Meta Marketing API call exceeded maximum retry attempts.");
}

/**
 * Verifies ad account credentials by fetching the real account currency, timezone, and status.
 */
export async function verifyAdAccountCredentials(options: {
  adAccountId: string;
  token: string;
  tenantId?: string;
}): Promise<{
  verified: boolean;
  accountName: string;
  accountCurrency: string;
  accountTimezoneName: string;
  accountTimezoneOffsetHours: number;
  accountStatus: number;
  amountSpent: string;
}> {
  const tenantId = options.tenantId || DEFAULT_TENANT_ID;
  const actId = normalizeAdAccountId(options.adAccountId);
  const token = options.token.trim();

  if (!actId) {
    throw new Error("Ad Account ID is required (e.g. act_1234567890).");
  }
  if (!token) {
    throw new Error("Marketing API Access Token is required.");
  }

  const accountFields = deduplicateFields(
    "id,name,currency,timezone_name,timezone_offset_hours_utc,account_status,business_name,amount_spent"
  );
  const endpoint = `https://graph.facebook.com/${META_MARKETING_API_VERSION}/${actId}?fields=${accountFields}`;

  try {
    interface AccountResponse {
      id: string;
      name?: string;
      currency?: string;
      timezone_name?: string;
      timezone_offset_hours_utc?: number;
      account_status?: number;
      business_name?: string;
      amount_spent?: string;
    }

    const { data } = await callMetaMarketingGraphApi<AccountResponse>(endpoint, token);

    const verifiedData = {
      verified: true,
      accountName: data.name || data.business_name || "Meta Ad Account",
      accountCurrency: data.currency || "BDT",
      accountTimezoneName: data.timezone_name || "Asia/Dhaka",
      accountTimezoneOffsetHours:
        typeof data.timezone_offset_hours_utc === "number" ? data.timezone_offset_hours_utc : 6,
      accountStatus: typeof data.account_status === "number" ? data.account_status : 1,
      amountSpent: data.amount_spent || "0",
    };

    // Update settings with verified metadata
    await updateMetaMarketingSettings(tenantId, {
      adAccountId: actId,
      accessToken: token,
      accountName: verifiedData.accountName,
      accountCurrency: verifiedData.accountCurrency,
      accountTimezoneName: verifiedData.accountTimezoneName,
      accountTimezoneOffsetHours: verifiedData.accountTimezoneOffsetHours,
      accountStatus: verifiedData.accountStatus,
      status: "connected",
      lastVerifiedAt: new Date().toISOString(),
      lastErrorMessage: "",
    });

    return verifiedData;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to verify ad account";
    const status = error instanceof MetaMarketingApiError && error.code === 190 ? "token_expired" : "error";

    await updateMetaMarketingSettings(tenantId, {
      adAccountId: actId,
      status,
      lastErrorMessage: errorMsg,
    });

    throw error;
  }
}
