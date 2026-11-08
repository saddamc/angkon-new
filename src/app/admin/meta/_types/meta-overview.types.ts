import type { PublicAdminPixelSettings } from "@/server/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta-marketing-settings";
import type { PerformanceDataPoint } from "@/components/admin/meta/performance-chart";

export type AnalyticsPeriod = "today" | "7d" | "30d" | "month" | "year";

export interface MetaAnalyticsData {
  revenue: { total: number; paid: number; pending: number; net: number; aov: number };
  adSpend?: {
    total: number;
    clicks: number;
    impressions: number;
    currency: string;
    currencySymbol?: string;
    totalInBdt?: number;
    exchangeRate?: number;
    blendedRoas: number;
  };
  orders: { total: number; cancelled: number; completed: number };
  customers: { total: number; new: number };
  products: { total: number };
}

export interface MetaOverviewState {
  settings: PublicAdminPixelSettings | null;
  marketingSettings: PublicAdminMetaMarketingSettings | null;
  refreshing: boolean;
  stats: Record<string, number>;
  catalogCount: number | null;
  domainVerified: boolean | null;
  analyticsData: MetaAnalyticsData | null;
  timeseries: PerformanceDataPoint[];
  activeMetrics: Record<string, boolean>;
  analyticsPeriod: AnalyticsPeriod;
  analyticsLoading: boolean;
  lastUpdated: string;
  copiedDatasetId: boolean;
  pixelId: string;
  isPixelEnabled: boolean;
  isCapiActive: boolean;
  isAdsActive: boolean;
  isMarketingConnected: boolean;
  pixelStatus?: { state: string };
  capiStatus?: { state: string };
  adsStatus?: { state: string };
  countPageView: number;
  countViewContent: number;
  countAddToCart: number;
  countInitiateCheckout: number;
  countPurchase: number;
  totalCapturedEvents: number;
  viewToCartRate: string;
  cartToPurchaseRate: string;
  handleToggleMetric: (id: string, nextChecked: boolean) => void;
  setAnalyticsPeriod: (period: AnalyticsPeriod) => void;
  fetchData: () => Promise<void>;
  handleExportCsv: () => void;
  copyDatasetId: () => void;
}
