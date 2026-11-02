import { connectToDatabase } from "@/lib/mongodb";
import {
  MetaAdReport,
  IMetaActionItem,
  MetaAdReportingLevel,
} from "@/models/MetaAdReport";
import {
  MetaAdImportJob,
  IMetaAdImportJob,
} from "@/models/MetaAdImportJob";
import {
  getMetaMarketingSettings,
  updateMetaMarketingSettings,
  normalizeAdAccountId,
  computeAttributionConfigKey,
  MetaAttributionConfig,
  DEFAULT_ATTRIBUTION_CONFIG,
} from "./meta-marketing-settings";
import { DEFAULT_TENANT_ID } from "./tenant";

export const META_MARKETING_API_VERSION = "v22.0";
const MAX_RETRIES = 3;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MetaApiRateLimitInfo {
  callCountPct?: number;
  totalTimePct?: number;
  totalCpuTimePct?: number;
  estimatedTimeToRegainAccess?: number; // in minutes
}

export interface MetaApiErrorDetails {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
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

/**
 * Validates the 37-month historical boundary enforced by Meta Marketing API.
 */
export function validateHistoricalBoundary(sinceDateStr: string): void {
  const target = new Date(`${sinceDateStr}T00:00:00.000Z`);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 37);

  if (target < cutoff) {
    throw new Error(
      `Date '${sinceDateStr}' exceeds the Meta Marketing API historical boundary of 37 months (cutoff: ${cutoff
        .toISOString()
        .slice(0, 10)}).`
    );
  }
}

/**
 * Generates 30-day slices for safe ingestion without hitting API timeout or payload limits.
 */
export function generate30DaySlices(sinceStr: string, untilStr: string) {
  const slices = [];
  let currentStart = new Date(`${sinceStr}T00:00:00.000Z`);
  const finalEnd = new Date(`${untilStr}T23:59:59.999Z`);

  if (currentStart > finalEnd) {
    throw new Error("Start date (since) cannot be after end date (until).");
  }

  let index = 0;
  while (currentStart <= finalEnd) {
    const nextEnd = new Date(currentStart);
    nextEnd.setDate(nextEnd.getDate() + 29); // 30 days inclusive

    const actualEnd = nextEnd > finalEnd ? finalEnd : nextEnd;

    slices.push({
      sliceIndex: index++,
      since: currentStart.toISOString().slice(0, 10),
      until: actualEnd.toISOString().slice(0, 10),
      status: "pending" as const,
      recordsImported: 0,
      spendInSlice: 0,
    });

    currentStart = new Date(actualEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return slices;
}

/**
 * Normalizes and deduplicates a comma-separated or array list of field names.
 * Ensures each field appears exactly once, preserving deterministic ordering
 * and stripping any empty or whitespace strings.
 */
export function deduplicateFieldsList(fields: string | string[]): string[] {
  const rawList = Array.isArray(fields)
    ? fields
    : typeof fields === "string"
    ? fields.split(",")
    : [];

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const raw of rawList) {
    const field = String(raw || "").trim();
    if (field && !seen.has(field)) {
      seen.add(field);
      unique.push(field);
    }
  }

  return unique;
}

/**
 * Returns a deduplicated comma-separated string of field names.
 */
export function deduplicateFields(fields: string | string[]): string {
  return deduplicateFieldsList(fields).join(",");
}

/**
 * Core metrics requested across all ad reporting levels.
 */
export const META_INSIGHT_COMMON_METRICS = [
  "spend",
  "impressions",
  "clicks",
  "reach",
  "frequency",
  "cpc",
  "cpm",
  "ctr",
  "cost_per_action_type",
  "purchase_roas",
  "actions",
  "action_values",
  "date_start",
] as const;

/**
 * Builds the canonical, deduplicated fields list for a given reporting level.
 * Guarantees that campaign_id, adset_id, ad_id and metric fields are never duplicated.
 */
export function buildInsightsFieldsForLevel(level: MetaAdReportingLevel = "campaign"): string {
  let levelSpecificFields: string[] = [];

  if (level === "adset") {
    levelSpecificFields = ["campaign_id", "campaign_name", "adset_id", "adset_name"];
  } else if (level === "ad") {
    levelSpecificFields = ["campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name"];
  } else if (level === "account") {
    levelSpecificFields = ["account_id", "account_name"];
  } else {
    // default: "campaign"
    levelSpecificFields = ["campaign_id", "campaign_name"];
  }

  return deduplicateFields([...levelSpecificFields, ...META_INSIGHT_COMMON_METRICS]);
}

export interface FetchInsightsOptions {
  since: string;
  until: string;
  level?: MetaAdReportingLevel;
  breakdown?: string;
  attributionConfig?: MetaAttributionConfig;
  tenantId?: string;
  adAccountId?: string;
  token?: string;
  fields?: string | string[];
}

export interface ParsedMetaInsightRecord {
  level: MetaAdReportingLevel;
  entityId: string;
  entityName: string;
  parentId?: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpa: number;
  metaPurchases: number;
  metaPurchaseValue: number;
  metaRoas: number;
  rawActions: IMetaActionItem[];
  rawActionValues: IMetaActionItem[];
}

/**
 * Extracts purchases and purchase values accurately from raw actions/action_values.
 */
export function extractWebsitePurchases(
  actions: IMetaActionItem[] = [],
  actionValues: IMetaActionItem[] = []
): { purchases: number; purchaseValue: number } {
  let purchases = 0;
  let purchaseValue = 0;

  const validActionTypes = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];

  for (const item of actions) {
    if (validActionTypes.includes(item.action_type)) {
      purchases = Math.max(purchases, parseInt(item.value || "0", 10));
    }
  }

  for (const item of actionValues) {
    if (validActionTypes.includes(item.action_type)) {
      purchaseValue = Math.max(purchaseValue, parseFloat(item.value || "0"));
    }
  }

  return { purchases, purchaseValue };
}

/**
 * Fetches daily Meta Insights for a single bounded slice.
 */
export async function fetchMetaDailyInsightsSlice(
  options: FetchInsightsOptions
): Promise<{
  records: ParsedMetaInsightRecord[];
  rateLimitInfo: MetaApiRateLimitInfo;
}> {
  validateHistoricalBoundary(options.since);

  const tenantId = options.tenantId || DEFAULT_TENANT_ID;
  const settings = await getMetaMarketingSettings(tenantId);
  const actId = normalizeAdAccountId(options.adAccountId || settings.adAccountId);
  const token = (options.token || settings.accessToken || "").trim();
  const level: MetaAdReportingLevel = options.level || "campaign";

  if (!actId || !token) {
    throw new Error("Meta Ad Account ID or Marketing API Token is missing in settings.");
  }

  const timeRange = JSON.stringify({ since: options.since, until: options.until });
  const attributionConfig = options.attributionConfig || settings.attributionConfig || DEFAULT_ATTRIBUTION_CONFIG;

  const actionWindowsParam = encodeURIComponent(JSON.stringify(attributionConfig.actionAttributionWindows));
  const actionReportTimeParam = attributionConfig.actionReportTime;

  const fields = options.fields
    ? deduplicateFields(options.fields)
    : buildInsightsFieldsForLevel(level);

  let endpoint: string | null = `https://graph.facebook.com/${META_MARKETING_API_VERSION}/${actId}/insights?level=${level}&fields=${fields}&time_range=${encodeURIComponent(
    timeRange
  )}&time_increment=1&action_attribution_windows=${actionWindowsParam}&action_report_time=${actionReportTimeParam}&limit=100`;

  const records: ParsedMetaInsightRecord[] = [];
  let lastRateLimit: MetaApiRateLimitInfo = {};

  interface ApiInsightRow {
    campaign_id?: string;
    campaign_name?: string;
    adset_id?: string;
    adset_name?: string;
    ad_id?: string;
    ad_name?: string;
    date_start: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    reach?: string;
    frequency?: string;
    cpc?: string;
    cpm?: string;
    ctr?: string;
    cost_per_action_type?: Array<{ action_type: string; value: string }>;
    purchase_roas?: Array<{ action_type: string; value: string }>;
    actions?: Array<{ action_type: string; value: string }>;
    action_values?: Array<{ action_type: string; value: string }>;
  }

  interface InsightsResponse {
    data?: ApiInsightRow[];
    paging?: { next?: string };
  }

  while (endpoint && records.length < 5000) {
    const apiResult = await callMetaMarketingGraphApi<InsightsResponse>(endpoint, token);
    const res: InsightsResponse = apiResult.data;
    lastRateLimit = apiResult.rateLimitInfo;

    if (Array.isArray(res.data)) {
      for (const item of res.data) {
        let entityId = item.campaign_id || "";
        let entityName = item.campaign_name || "Unnamed Campaign";
        let parentId: string | undefined = undefined;

        if (level === "adset") {
          entityId = item.adset_id || item.campaign_id || "";
          entityName = item.adset_name || "Unnamed AdSet";
          parentId = item.campaign_id;
        } else if (level === "ad") {
          entityId = item.ad_id || item.adset_id || item.campaign_id || "";
          entityName = item.ad_name || "Unnamed Ad";
          parentId = item.adset_id || item.campaign_id;
        } else if (level === "account") {
          entityId = actId;
          entityName = settings.accountName || "Ad Account";
        }

        const spend = parseFloat(item.spend || "0");
        const impressions = parseInt(item.impressions || "0", 10);
        const clicks = parseInt(item.clicks || "0", 10);
        const reach = parseInt(item.reach || "0", 10);
        const frequency = parseFloat(item.frequency || "0");
        const cpc = parseFloat(item.cpc || "0");
        const cpm = parseFloat(item.cpm || "0");
        const ctr = parseFloat(item.ctr || "0");

        // Parse CPA
        let cpa = 0;
        if (Array.isArray(item.cost_per_action_type)) {
          const cpaItem = item.cost_per_action_type.find(
            (c: { action_type: string; value: string }) => c.action_type === "omni_purchase" || c.action_type === "purchase"
          );
          if (cpaItem) cpa = parseFloat(cpaItem.value || "0");
        }

        // Parse ROAS
        let metaRoas = 0;
        if (Array.isArray(item.purchase_roas)) {
          const roasEntry =
            item.purchase_roas.find((r: { action_type: string; value: string }) => r.action_type === "omni_purchase" || r.action_type === "purchase") ||
            item.purchase_roas[0];
          metaRoas = roasEntry ? parseFloat(roasEntry.value || "0") : 0;
        }

        const rawActions: IMetaActionItem[] = Array.isArray(item.actions) ? item.actions : [];
        const rawActionValues: IMetaActionItem[] = Array.isArray(item.action_values) ? item.action_values : [];

        const { purchases: metaPurchases, purchaseValue: metaPurchaseValue } = extractWebsitePurchases(
          rawActions,
          rawActionValues
        );

        records.push({
          level,
          entityId,
          entityName,
          parentId,
          date: item.date_start,
          spend,
          impressions,
          clicks,
          reach,
          frequency,
          cpc,
          cpm,
          ctr,
          cpa,
          metaPurchases,
          metaPurchaseValue,
          metaRoas,
          rawActions,
          rawActionValues,
        });
      }
    }

    endpoint = res.paging?.next || null;
  }

  return { records, rateLimitInfo: lastRateLimit };
}

/**
 * Creates and runs a resumable import job partitioned into 30-day slices.
 */
export async function createAndRunAdImportJob(options: {
  since: string;
  until: string;
  level?: MetaAdReportingLevel;
  breakdown?: string;
  tenantId?: string;
}): Promise<IMetaAdImportJob> {
  await connectToDatabase();
  const tenantId = options.tenantId || DEFAULT_TENANT_ID;
  const settings = await getMetaMarketingSettings(tenantId);
  const actId = normalizeAdAccountId(settings.adAccountId);
  const level = options.level || "campaign";
  const breakdown = options.breakdown || "none";
  const attributionConfigKey = computeAttributionConfigKey(settings.attributionConfig);

  validateHistoricalBoundary(options.since);
  const slices = generate30DaySlices(options.since, options.until);

  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const job = new MetaAdImportJob({
    jobId,
    tenantId,
    adAccountId: actId,
    level,
    breakdown,
    attributionConfigKey,
    requestedRange: { since: options.since, until: options.until },
    totalSlices: slices.length,
    completedSlices: 0,
    slices,
    status: "running",
    startedAt: new Date(),
    currency: settings.accountCurrency || "BDT",
  });

  await job.save();

  // Run slices
  await executeJobSlices(job, settings.accessToken, settings.accountCurrency);

  return job;
}

/**
 * Executes slices of an existing import job.
 */
async function executeJobSlices(
  job: IMetaAdImportJob,
  token: string,
  currency: string
): Promise<void> {
  // Ensure legacy / obsolete indexes are dropped so they never block upserts
  try {
    if (MetaAdReport.collection) {
      await MetaAdReport.collection.dropIndex("tenantId_1_adAccountId_1_campaignId_1_date_1").catch(() => {});
      await MetaAdReport.collection.dropIndex("campaignId_1").catch(() => {});
    }
  } catch {
    // Non-fatal if index already dropped or collection not initialized
  }

  let totalRecords = job.totalRecords || 0;
  let totalSpend = job.totalSpend || 0;
  let completedCount = job.completedSlices || 0;

  for (let i = job.currentSliceIndex; i < job.slices.length; i++) {
    const slice = job.slices[i];
    if (slice.status === "completed") continue;

    slice.status = "running";
    slice.startedAt = new Date();
    await job.save();

    try {
      const { records } = await fetchMetaDailyInsightsSlice({
        since: slice.since,
        until: slice.until,
        level: job.level,
        breakdown: job.breakdown,
        tenantId: job.tenantId,
        adAccountId: job.adAccountId,
        token,
      });

      let sliceSpend = 0;
      for (const rec of records) {
        sliceSpend += rec.spend;

        // Upsert by composite unique index to strictly isolate and prevent duplicate counting
        await MetaAdReport.findOneAndUpdate(
          {
            tenantId: job.tenantId,
            adAccountId: job.adAccountId,
            level: job.level,
            entityId: rec.entityId,
            date: rec.date,
            breakdownKey: job.breakdown,
            attributionConfigKey: job.attributionConfigKey,
          },
          {
            $set: {
              entityName: rec.entityName,
              parentId: rec.parentId,
              spend: rec.spend,
              currency,
              impressions: rec.impressions,
              clicks: rec.clicks,
              reach: rec.reach,
              frequency: rec.frequency,
              cpc: rec.cpc,
              cpm: rec.cpm,
              ctr: rec.ctr,
              cpa: rec.cpa,
              metaPurchases: rec.metaPurchases,
              metaPurchaseValue: rec.metaPurchaseValue,
              metaRoas: rec.metaRoas,
              rawActions: rec.rawActions,
              rawActionValues: rec.rawActionValues,
              source: "meta_marketing_api",
            },
          },
          { upsert: true, new: true }
        );
      }

      slice.status = "completed";
      slice.completedAt = new Date();
      slice.recordsImported = records.length;
      slice.spendInSlice = sliceSpend;

      totalRecords += records.length;
      totalSpend += sliceSpend;
      completedCount++;

      job.currentSliceIndex = i + 1;
      job.completedSlices = completedCount;
      job.totalRecords = totalRecords;
      job.totalSpend = totalSpend;
      await job.save();
    } catch (error) {
      if (error instanceof MetaMarketingApiError && error.isRateLimit) {
        slice.status = "rate_limited";
        slice.rateLimitCode = error.code;
        slice.errorMessage = error.message;

        const regainMinutes = error.regainAccessMinutes || 15;
        const regainDate = new Date(Date.now() + regainMinutes * 60000);
        slice.regainAccessAt = regainDate;

        job.status = "paused_rate_limit";
        job.errorMessage = `Rate limit ${error.code} reached. Resume after ${regainDate.toISOString()}`;
        await job.save();

        // Update marketing settings with rate-limit status
        await updateMetaMarketingSettings(job.tenantId, {
          status: "rate_limited",
          rateLimitRegainAccessAt: regainDate.toISOString(),
          lastErrorMessage: error.message,
        });

        return; // Pause execution
      }

      // Non-rate-limit failure
      slice.status = "failed";
      slice.errorMessage = error instanceof Error ? error.message : "Slice failed";
      job.status = "failed";
      job.errorMessage = slice.errorMessage;
      await job.save();
      throw error;
    }
  }

  job.status = "completed";
  job.completedAt = new Date();
  await job.save();
}

/**
 * Resumes a paused or incomplete job.
 */
export async function resumeAdImportJob(jobId: string): Promise<IMetaAdImportJob> {
  await connectToDatabase();
  const job = await MetaAdImportJob.findOne({ jobId });
  if (!job) {
    throw new Error(`Import job '${jobId}' not found.`);
  }

  if (job.status === "completed") {
    return job;
  }

  const settings = await getMetaMarketingSettings(job.tenantId);
  job.status = "running";
  job.errorMessage = undefined;
  await job.save();

  await executeJobSlices(job, settings.accessToken, settings.accountCurrency);
  return job;
}
