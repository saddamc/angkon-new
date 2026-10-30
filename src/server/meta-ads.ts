import { connectToDatabase } from "@/lib/mongodb";
import { MetaAdReport, MetaAdImportLog } from "@/models/MetaAdReport";
import { Order } from "@/models/Order";
import { getPixelSettings, DEFAULT_TENANT_ID } from "./pixel-settings";

const GRAPH_API_VERSION = "v22.0";
const MAX_RETRIES = 3;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MetaCampaignItem {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective?: string;
  start_time?: string;
  stop_time?: string;
}

export interface MetaInsightDailyRecord {
  campaign_id: string;
  campaign_name: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  roas: number;
  metaPurchases: number;
  metaPurchaseValue: number;
}

/**
 * Executes a resilient fetch to Meta Graph API with exponential backoff on rate-limits.
 */
async function callMetaGraphApi<T>(endpoint: string, token: string): Promise<T> {
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

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return data as T;
    }

    const errorCode = data?.error?.code;
    const errorSubcode = data?.error?.error_subcode;
    const errorMessage = data?.error?.message || `HTTP ${response.status}`;

    // Meta Rate Limits: code 17 (User request limit), code 80004/80000 (Ad Account call limit), code 32 (Page request limit)
    const isRateLimit =
      errorCode === 17 ||
      errorCode === 32 ||
      errorCode === 80004 ||
      errorCode === 80000 ||
      errorSubcode === 2446079;

    if (isRateLimit && attempt < MAX_RETRIES) {
      console.warn(`[Meta Marketing API] Rate limit encountered. Backing off ${delay}ms...`);
      await wait(delay);
      delay *= 2;
      continue;
    }

    throw new Error(
      `Meta Marketing API Error (${errorCode || response.status}): ${errorMessage}`
    );
  }

  throw new Error("Meta Marketing API call exceeded maximum retry attempts.");
}

/**
 * Fetches available ad campaigns from Meta Marketing API with pagination.
 */
export async function fetchMetaCampaigns(options?: {
  adAccountId?: string;
  token?: string;
  tenantId?: string;
}): Promise<MetaCampaignItem[]> {
  const tenantId = options?.tenantId || DEFAULT_TENANT_ID;
  const settings = await getPixelSettings(tenantId);
  const rawAccountId = (options?.adAccountId || settings.adAccountId || "").trim();
  const token = (options?.token || settings.marketingApiAccessToken || "").trim();

  if (!rawAccountId) {
    throw new Error("Meta Ad Account ID is not configured (e.g. act_123456789).");
  }
  if (!token) {
    throw new Error(
      "Meta Marketing API Access Token is missing. Provide an authorized system user or OAuth token with 'ads_read' permissions."
    );
  }

  const actId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;
  let endpoint: string | null = `https://graph.facebook.com/${GRAPH_API_VERSION}/${actId}/campaigns?fields=id,name,status,effective_status,objective,start_time,stop_time&limit=50`;

  const allCampaigns: MetaCampaignItem[] = [];

  while (endpoint && allCampaigns.length < 200) {
    interface CampaignsResponse {
      data?: MetaCampaignItem[];
      paging?: { next?: string };
    }

    const res: CampaignsResponse = await callMetaGraphApi<CampaignsResponse>(endpoint, token);
    if (Array.isArray(res.data)) {
      allCampaigns.push(...res.data);
    }

    endpoint = res.paging?.next || null;
  }

  return allCampaigns;
}

/**
 * Retrieves daily campaign Insights from Meta Marketing API for a specific date range.
 * Never fabricates data; returns empty array if no historical data exists.
 */
export async function fetchMetaDailyInsights(options: {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
  adAccountId?: string;
  token?: string;
  tenantId?: string;
}): Promise<MetaInsightDailyRecord[]> {
  const tenantId = options.tenantId || DEFAULT_TENANT_ID;
  const settings = await getPixelSettings(tenantId);
  const rawAccountId = (options.adAccountId || settings.adAccountId || "").trim();
  const token = (options.token || settings.marketingApiAccessToken || "").trim();

  if (!rawAccountId || !token) {
    throw new Error("Meta Ad Account ID or Marketing API Token is missing.");
  }

  const actId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;
  const timeRange = JSON.stringify({ since: options.since, until: options.until });

  let endpoint: string | null = `https://graph.facebook.com/${GRAPH_API_VERSION}/${actId}/insights?fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,ctr,purchase_roas,actions,action_values,date_start&time_range=${encodeURIComponent(
    timeRange
  )}&time_increment=1&limit=100`;

  const records: MetaInsightDailyRecord[] = [];

  interface InsightApiItem {
    campaign_id: string;
    campaign_name: string;
    date_start: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    cpc?: string;
    ctr?: string;
    purchase_roas?: Array<{ action_type: string; value: string }>;
    actions?: Array<{ action_type: string; value: string }>;
    action_values?: Array<{ action_type: string; value: string }>;
  }

  interface InsightsApiResponse {
    data?: InsightApiItem[];
    paging?: { next?: string };
  }

  while (endpoint && records.length < 500) {
    const res: InsightsApiResponse = await callMetaGraphApi<InsightsApiResponse>(endpoint, token);
    if (Array.isArray(res.data)) {
      for (const item of res.data) {
        const spend = parseFloat(item.spend || "0");
        const impressions = parseInt(item.impressions || "0", 10);
        const clicks = parseInt(item.clicks || "0", 10);
        const cpc = parseFloat(item.cpc || "0");
        const ctr = parseFloat(item.ctr || "0");

        // Parse ROAS
        let roas = 0;
        if (Array.isArray(item.purchase_roas)) {
          const roasEntry =
            item.purchase_roas.find((r) => r.action_type === "omni_purchase" || r.action_type === "purchase") ||
            item.purchase_roas[0];
          roas = roasEntry ? parseFloat(roasEntry.value || "0") : 0;
        }

        // Parse Platform Attributed Purchases & Value
        let metaPurchases = 0;
        if (Array.isArray(item.actions)) {
          const p = item.actions.find(
            (a) => a.action_type === "purchase" || a.action_type === "omni_purchase"
          );
          metaPurchases = p ? parseInt(p.value || "0", 10) : 0;
        }

        let metaPurchaseValue = 0;
        if (Array.isArray(item.action_values)) {
          const pv = item.action_values.find(
            (a) => a.action_type === "purchase" || a.action_type === "omni_purchase"
          );
          metaPurchaseValue = pv ? parseFloat(pv.value || "0") : 0;
        }

        records.push({
          campaign_id: item.campaign_id,
          campaign_name: item.campaign_name || "Campaign",
          date: item.date_start,
          spend,
          impressions,
          clicks,
          cpc,
          ctr,
          roas,
          metaPurchases,
          metaPurchaseValue,
        });
      }
    }
    endpoint = res.paging?.next || null;
  }

  return records;
}

/**
 * Imports historical Meta Insights into MongoDB with duplicate prevention and audit logging.
 */
export async function importMetaHistoricalInsights(options: {
  since: string;
  until: string;
  tenantId?: string;
}): Promise<{
  importedCount: number;
  totalSpend: number;
  records: MetaInsightDailyRecord[];
}> {
  await connectToDatabase();
  const tenantId = options.tenantId || DEFAULT_TENANT_ID;
  const settings = await getPixelSettings(tenantId);

  const actId = (settings.adAccountId || "").trim();
  const token = (settings.marketingApiAccessToken || "").trim();

  if (!actId || !token) {
    throw new Error(
      "Meta Ad Account ID or Marketing API Token is missing in store settings."
    );
  }

  try {
    const rawRecords = await fetchMetaDailyInsights({
      since: options.since,
      until: options.until,
      adAccountId: actId,
      token,
      tenantId,
    });

    let totalSpend = 0;
    let importedCount = 0;

    for (const rec of rawRecords) {
      totalSpend += rec.spend;

      // Upsert to guarantee strict duplicate prevention
      await MetaAdReport.findOneAndUpdate(
        {
          tenantId,
          adAccountId: actId,
          campaignId: rec.campaign_id,
          date: rec.date,
        },
        {
          $set: {
            campaignName: rec.campaign_name,
            spend: rec.spend,
            currency: "BDT",
            impressions: rec.impressions,
            clicks: rec.clicks,
            cpc: rec.cpc,
            ctr: rec.ctr,
            roas: rec.roas,
            metaPurchases: rec.metaPurchases,
            metaPurchaseValue: rec.metaPurchaseValue,
            source: "meta_marketing_api",
          },
        },
        { upsert: true, new: true }
      );
      importedCount++;
    }

    // Log the import execution
    await MetaAdImportLog.create({
      tenantId,
      adAccountId: actId,
      dateRange: { since: options.since, until: options.until },
      recordsImported: importedCount,
      totalSpend,
      status: "success",
    });

    return { importedCount, totalSpend, records: rawRecords };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Import failed";
    await MetaAdImportLog.create({
      tenantId,
      adAccountId: actId,
      dateRange: { since: options.since, until: options.until },
      status: "failed",
      errorMessage: errorMsg,
    }).catch(() => {});

    throw error;
  }
}

/**
 * Generates an executive comparison separating Meta Platform-Attributed Conversions
 * from Actual Realized Store Orders & Revenue.
 * Truthful reporting: when no ad data is imported, indicates unavailable rather than fabricated zeros.
 */
export async function getAttributionComparisonReport(options: {
  since: string;
  until: string;
  tenantId?: string;
}) {
  await connectToDatabase();
  const tenantId = options.tenantId || DEFAULT_TENANT_ID;

  // 1. Meta Platform-Reported Ad Performance
  const adReports = await MetaAdReport.find({
    tenantId,
    date: { $gte: options.since, $lte: options.until },
  }).lean();

  const hasAdData = adReports.length > 0;

  const metaAgg = adReports.reduce(
    (acc, cur) => {
      acc.totalSpend += cur.spend || 0;
      acc.totalImpressions += cur.impressions || 0;
      acc.totalClicks += cur.clicks || 0;
      acc.metaReportedPurchases += cur.metaPurchases || 0;
      acc.metaReportedRevenue += cur.metaPurchaseValue || 0;
      return acc;
    },
    {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      metaReportedPurchases: 0,
      metaReportedRevenue: 0,
    }
  );

  // 2. Real Store Orders & Revenue (Delivered, Confirmed, Cancelled, Refunds)
  const sinceDate = new Date(`${options.since}T00:00:00.000Z`);
  const untilDate = new Date(`${options.until}T23:59:59.999Z`);

  const storeOrders = await Order.find({
    createdAt: { $gte: sinceDate, $lte: untilDate },
  }).lean();

  let storeTotalOrders = 0;
  let storeDeliveredOrders = 0;
  let storeCancelledOrders = 0;
  let storePaidRevenue = 0;
  let storePendingRevenue = 0;
  let storeRefunds = 0;

  for (const order of storeOrders) {
    storeTotalOrders++;
    if (order.orderStatus === "delivered" || order.orderStatus === "completed") {
      storeDeliveredOrders++;
      storePaidRevenue += order.total || 0;
    } else if (order.paymentStatus === "paid") {
      storePaidRevenue += order.total || 0;
    } else if (order.orderStatus === "cancelled" || order.orderStatus === "failed") {
      storeCancelledOrders++;
    } else if (order.orderStatus === "refunded") {
      storeRefunds++;
    } else {
      storePendingRevenue += order.total || 0;
    }
  }

  const actualRealizedNetRevenue = storePaidRevenue;

  if (!hasAdData) {
    return {
      period: { since: options.since, until: options.until },
      metaPlatformMetrics: {
        isAvailable: false,
        status: "no_imported_ad_data",
        totalSpend: null,
        totalImpressions: null,
        totalClicks: null,
        metaReportedPurchases: null,
        metaReportedRevenue: null,
        metaClaimedRoas: null,
      },
      actualStoreMetrics: {
        storeTotalOrders,
        storeDeliveredOrders,
        storeCancelledOrders,
        storeRefunds,
        actualRealizedNetRevenue,
        storePendingRevenue,
        trueBlendedRoas: null,
      },
      attributionDiscrepancy: {
        isAvailable: false,
        orderGap: null,
        revenueGap: null,
        roasInflation: null,
      },
    };
  }

  const trueBlendedRoas =
    metaAgg.totalSpend > 0
      ? Number((actualRealizedNetRevenue / metaAgg.totalSpend).toFixed(2))
      : 0;

  const metaClaimedRoas =
    metaAgg.totalSpend > 0
      ? Number((metaAgg.metaReportedRevenue / metaAgg.totalSpend).toFixed(2))
      : 0;

  return {
    period: { since: options.since, until: options.until },
    metaPlatformMetrics: {
      isAvailable: true,
      status: "verified_ad_data",
      totalSpend: metaAgg.totalSpend,
      totalImpressions: metaAgg.totalImpressions,
      totalClicks: metaAgg.totalClicks,
      metaReportedPurchases: metaAgg.metaReportedPurchases,
      metaReportedRevenue: metaAgg.metaReportedRevenue,
      metaClaimedRoas,
    },
    actualStoreMetrics: {
      storeTotalOrders,
      storeDeliveredOrders,
      storeCancelledOrders,
      storeRefunds,
      actualRealizedNetRevenue,
      storePendingRevenue,
      trueBlendedRoas,
    },
    attributionDiscrepancy: {
      isAvailable: true,
      orderGap: metaAgg.metaReportedPurchases - storeDeliveredOrders,
      revenueGap: metaAgg.metaReportedRevenue - actualRealizedNetRevenue,
      roasInflation: Number((metaClaimedRoas - trueBlendedRoas).toFixed(2)),
    },
  };
}
