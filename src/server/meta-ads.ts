import { connectToDatabase } from "@/lib/mongodb";
import {
  MetaAdReport,
  MetaAdReportingLevel,
} from "@/models/MetaAdReport";
import { Order } from "@/models/Order";
import {
  getMetaMarketingSettings,
  normalizeAdAccountId,
  computeAttributionConfigKey,
} from "./meta-marketing-settings";
import {
  callMetaMarketingGraphApi,
  createAndRunAdImportJob,
  fetchMetaDailyInsightsSlice,
  ParsedMetaInsightRecord,
  deduplicateFields,
} from "./meta-marketing-api";
import { DEFAULT_TENANT_ID } from "./tenant";

export const META_MARKETING_API_VERSION = "v22.0";

export interface MetaCampaignItem {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective?: string;
  start_time?: string;
  stop_time?: string;
}

/**
 * Fetches campaigns for the ad account with pagination.
 */
export async function fetchMetaCampaigns(options?: {
  adAccountId?: string;
  token?: string;
  tenantId?: string;
}): Promise<MetaCampaignItem[]> {
  const tenantId = options?.tenantId || DEFAULT_TENANT_ID;
  const settings = await getMetaMarketingSettings(tenantId);
  const actId = normalizeAdAccountId(options?.adAccountId || settings.adAccountId);
  const token = (options?.token || settings.accessToken || "").trim();

  if (!actId) {
    throw new Error("Meta Ad Account ID is not configured (e.g. act_1234567890).");
  }
  if (!token) {
    throw new Error(
      "Meta Marketing API Access Token is missing. Provide an authorized token with 'ads_read' permission."
    );
  }

  const fields = deduplicateFields(
    "id,name,status,effective_status,objective,start_time,stop_time"
  );
  let endpoint: string | null = `https://graph.facebook.com/${META_MARKETING_API_VERSION}/${actId}/campaigns?fields=${fields}&limit=50`;

  const allCampaigns: MetaCampaignItem[] = [];

  interface CampaignsResponse {
    data?: MetaCampaignItem[];
    paging?: { next?: string };
  }

  while (endpoint && allCampaigns.length < 200) {
    const apiResult = await callMetaMarketingGraphApi<CampaignsResponse>(endpoint, token);
    const res: CampaignsResponse = apiResult.data;
    if (Array.isArray(res.data)) {
      allCampaigns.push(...res.data);
    }
    endpoint = res.paging?.next || null;
  }

  return allCampaigns;
}

/**
 * Fetches daily insights on demand for preview/inspection.
 */
export async function fetchMetaDailyInsights(options: {
  since: string;
  until: string;
  level?: MetaAdReportingLevel;
  adAccountId?: string;
  token?: string;
  tenantId?: string;
  fields?: string | string[];
}): Promise<ParsedMetaInsightRecord[]> {
  const { records } = await fetchMetaDailyInsightsSlice({
    since: options.since,
    until: options.until,
    level: options.level || "campaign",
    tenantId: options.tenantId,
    adAccountId: options.adAccountId,
    token: options.token,
    fields: options.fields,
  });

  return records;
}

/**
 * Triggers historical synchronization into MongoDB.
 */
export async function importMetaHistoricalInsights(options: {
  since: string;
  until: string;
  level?: MetaAdReportingLevel;
  tenantId?: string;
}) {
  const job = await createAndRunAdImportJob({
    since: options.since,
    until: options.until,
    level: options.level || "campaign",
    tenantId: options.tenantId,
  });

  return {
    jobId: job.jobId,
    importedCount: job.totalRecords,
    totalSpend: job.totalSpend,
    status: job.status,
  };
}

export interface DualLedgerAttributionReport {
  period: { since: string; until: string };
  reportingLevel: MetaAdReportingLevel;
  metaPlatformMetrics: {
    isAvailable: boolean;
    status: "verified_ad_data" | "no_imported_ad_data" | "rate_limited";
    currency: string;
    totalSpend: number | null;
    totalImpressions: number | null;
    totalClicks: number | null;
    totalReach: number | null;
    avgFrequency: number | null;
    avgCpc: number | null;
    avgCtr: number | null;
    avgCpm: number | null;
    metaReportedPurchases: number | null;
    metaReportedRevenue: number | null;
    metaClaimedRoas: number | null;
    entitiesCount: number;
  };
  actualStoreMetrics: {
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
    // Realized vs Pending Cash separation
    realizedPaidCash: number; // Card/MFS paid + settled COD
    refundedCash: number;
    netRealizedCash: number; // realizedPaidCash - refundedCash
    unsettledPendingCash: number; // Delivered pending courier settlement + in-transit COD
    // Cross-system comparison
    storeRealizedCashPerMetaSpend: number | null; // Diagnostic ratio
  };
  reconciliationDiagnostics: {
    isAvailable: boolean;
    purchaseCountGap: number | null; // Meta Purchases - Store Realized Orders
    revenueGap: number | null; // Meta Purchase Value - Net Realized Store Cash
    roasDiscrepancy: number | null; // Meta Claimed ROAS - Store Realized Diagnostic Ratio
    diagnosticDisclaimer: string;
  };
}

/**
 * Generates an executive dual-ledger reconciliation report.
 * Strictly isolates Meta platform-reported conversions from actual store cash operations.
 * Enforces single-level queries to prevent additive double-counting across campaign/adset/ad.
 */
export async function getAttributionComparisonReport(options: {
  since: string;
  until: string;
  level?: MetaAdReportingLevel;
  tenantId?: string;
}): Promise<DualLedgerAttributionReport> {
  await connectToDatabase();
  const tenantId = options.tenantId || DEFAULT_TENANT_ID;
  const level: MetaAdReportingLevel = options.level || "campaign";
  const settings = await getMetaMarketingSettings(tenantId);
  const attributionConfigKey = computeAttributionConfigKey(settings.attributionConfig);

  // 1. Meta Platform-Reported Ad Performance (Strictly filtered by level to avoid additive double-counting)
  const adReports = await MetaAdReport.find({
    tenantId,
    level,
    breakdownKey: "none",
    attributionConfigKey,
    date: { $gte: options.since, $lte: options.until },
  }).lean();

  const hasAdData = adReports.length > 0;
  const currency = adReports[0]?.currency || settings.accountCurrency || "BDT";

  const metaAgg = adReports.reduce(
    (acc, cur) => {
      acc.totalSpend += cur.spend || 0;
      acc.totalImpressions += cur.impressions || 0;
      acc.totalClicks += cur.clicks || 0;
      acc.totalReach += cur.reach || 0;
      acc.metaPurchases += cur.metaPurchases || 0;
      acc.metaPurchaseValue += cur.metaPurchaseValue || 0;
      return acc;
    },
    {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalReach: 0,
      metaPurchases: 0,
      metaPurchaseValue: 0,
    }
  );

  const avgCpc = metaAgg.totalClicks > 0 ? Number((metaAgg.totalSpend / metaAgg.totalClicks).toFixed(2)) : 0;
  const avgCtr = metaAgg.totalImpressions > 0 ? Number(((metaAgg.totalClicks / metaAgg.totalImpressions) * 100).toFixed(2)) : 0;
  const avgCpm = metaAgg.totalImpressions > 0 ? Number(((metaAgg.totalSpend / metaAgg.totalImpressions) * 1000).toFixed(2)) : 0;
  const avgFrequency = metaAgg.totalReach > 0 ? Number((metaAgg.totalImpressions / metaAgg.totalReach).toFixed(2)) : 1;

  const metaClaimedRoas =
    metaAgg.totalSpend > 0 ? Number((metaAgg.metaPurchaseValue / metaAgg.totalSpend).toFixed(2)) : null;

  // 2. Real Store Financial Ledger
  const sinceDate = new Date(`${options.since}T00:00:00.000Z`);
  const untilDate = new Date(`${options.until}T23:59:59.999Z`);

  const storeOrders = await Order.find({
    createdAt: { $gte: sinceDate, $lte: untilDate },
  }).lean();

  let totalOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let refundedOrders = 0;
  let realizedPaidCash = 0;
  let refundedCash = 0;
  let unsettledPendingCash = 0;

  for (const order of storeOrders) {
    totalOrders++;
    const total = order.total || 0;
    const isDelivered = order.orderStatus === "delivered" || order.orderStatus === "completed";
    const isPaid = order.paymentStatus === "paid";
    // Check if COD remittance was explicitly recorded as settled
    const isCodSettled = (order as unknown as Record<string, unknown>).codSettlementStatus === "settled";

    if (order.orderStatus === "refunded") {
      refundedOrders++;
      const orderRec = order as unknown as Record<string, unknown>;
      refundedCash += orderRec.refundAmount ? Number(orderRec.refundAmount) : total;
    } else if (order.orderStatus === "cancelled" || order.orderStatus === "failed") {
      cancelledCount(order);
      cancelledOrders++;
    } else if (isPaid || isCodSettled) {
      realizedPaidCash += total;
      if (isDelivered) deliveredOrders++;
    } else {
      // In-transit COD or delivered pending courier settlement
      unsettledPendingCash += total;
      if (isDelivered) deliveredOrders++;
    }
  }

  function cancelledCount(_o: unknown) {
    // Helper to keep loop readable
  }

  const netRealizedCash = Math.max(0, realizedPaidCash - refundedCash);

  // Store Realized Cash / Meta Ad Spend (Cross-System Diagnostic Ratio)
  const storeRealizedCashPerMetaSpend =
    hasAdData && metaAgg.totalSpend > 0
      ? Number((netRealizedCash / metaAgg.totalSpend).toFixed(2))
      : null;

  const diagnosticDisclaimer =
    "Dual-Ledger Notice: Meta Platform Conversions use statistical view/click attribution windows (e.g. 7d click, 1d view) and include cross-device touchpoints. Store Net Realized Cash reflects settled bank payments and courier payouts minus customer refunds. They operate as two independent accounting systems.";

  if (!hasAdData) {
    return {
      period: { since: options.since, until: options.until },
      reportingLevel: level,
      metaPlatformMetrics: {
        isAvailable: false,
        status: settings.status === "rate_limited" ? "rate_limited" : "no_imported_ad_data",
        currency,
        totalSpend: null,
        totalImpressions: null,
        totalClicks: null,
        totalReach: null,
        avgFrequency: null,
        avgCpc: null,
        avgCtr: null,
        avgCpm: null,
        metaReportedPurchases: null,
        metaReportedRevenue: null,
        metaClaimedRoas: null,
        entitiesCount: 0,
      },
      actualStoreMetrics: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        refundedOrders,
        realizedPaidCash,
        refundedCash,
        netRealizedCash,
        unsettledPendingCash,
        storeRealizedCashPerMetaSpend: null,
      },
      reconciliationDiagnostics: {
        isAvailable: false,
        purchaseCountGap: null,
        revenueGap: null,
        roasDiscrepancy: null,
        diagnosticDisclaimer,
      },
    };
  }

  const purchaseCountGap = metaAgg.metaPurchases - deliveredOrders;
  const revenueGap = Number((metaAgg.metaPurchaseValue - netRealizedCash).toFixed(2));
  const roasDiscrepancy =
    metaClaimedRoas !== null && storeRealizedCashPerMetaSpend !== null
      ? Number((metaClaimedRoas - storeRealizedCashPerMetaSpend).toFixed(2))
      : null;

  return {
    period: { since: options.since, until: options.until },
    reportingLevel: level,
    metaPlatformMetrics: {
      isAvailable: true,
      status: "verified_ad_data",
      currency,
      totalSpend: metaAgg.totalSpend,
      totalImpressions: metaAgg.totalImpressions,
      totalClicks: metaAgg.totalClicks,
      totalReach: metaAgg.totalReach,
      avgFrequency,
      avgCpc,
      avgCtr,
      avgCpm,
      metaReportedPurchases: metaAgg.metaPurchases,
      metaReportedRevenue: metaAgg.metaPurchaseValue,
      metaClaimedRoas,
      entitiesCount: adReports.length,
    },
    actualStoreMetrics: {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      realizedPaidCash,
      refundedCash,
      netRealizedCash,
      unsettledPendingCash,
      storeRealizedCashPerMetaSpend,
    },
    reconciliationDiagnostics: {
      isAvailable: true,
      purchaseCountGap,
      revenueGap,
      roasDiscrepancy,
      diagnosticDisclaimer,
    },
  };
}
