import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { DEFAULT_TENANT_ID } from "./tenant";
import { PIXEL_SETTINGS_KEY } from "./pixel-settings";
import {
  encryptTokenString,
  decryptTokenString,
  maskSecret as maskSecretSecure,
} from "@/lib/security/token-encryption";

export const META_MARKETING_SETTINGS_KEY = "meta_marketing";

export type MarketingApiConnectionStatus =
  | "unconfigured"
  | "connected"
  | "rate_limited"
  | "token_expired"
  | "error";

export interface MetaAttributionConfig {
  actionAttributionWindows: string[]; // e.g. ["7d_click", "1d_view"]
  actionReportTime: "conversion" | "impression";
}

export const DEFAULT_ATTRIBUTION_CONFIG: MetaAttributionConfig = {
  actionAttributionWindows: ["7d_click", "1d_view"],
  actionReportTime: "conversion",
};

export function computeAttributionConfigKey(config?: Partial<MetaAttributionConfig>): string {
  const windows = (config?.actionAttributionWindows || DEFAULT_ATTRIBUTION_CONFIG.actionAttributionWindows)
    .slice()
    .sort()
    .join("+");
  const reportTime = config?.actionReportTime || DEFAULT_ATTRIBUTION_CONFIG.actionReportTime;
  return `${windows}_rt_${reportTime}`.toLowerCase();
}

export interface MetaMarketingSettings {
  tenantId: string;
  adAccountId: string; // e.g. "act_1234567890" or "1234567890"
  accessToken: string; // User / System token with `ads_read` permission
  accountName?: string;
  accountCurrency: string; // Real currency from Meta Graph API e.g. "BDT", "USD"
  accountTimezoneName: string; // e.g. "Asia/Dhaka"
  accountTimezoneOffsetHours: number; // e.g. 6
  accountStatus?: number; // 1 = ACTIVE, 2 = DISABLED, etc.
  attributionConfig: MetaAttributionConfig;
  status: MarketingApiConnectionStatus;
  lastVerifiedAt?: string;
  lastErrorMessage?: string;
  rateLimitRegainAccessAt?: string;
  updatedAt?: string;
}

export interface PublicAdminMetaMarketingSettings {
  tenantId: string;
  adAccountId: string;
  hasAccessToken: boolean;
  maskedAccessToken: string;
  accountName: string;
  accountCurrency: string;
  accountTimezoneName: string;
  accountTimezoneOffsetHours: number;
  accountStatus: number | null;
  attributionConfig: MetaAttributionConfig;
  attributionConfigKey: string;
  status: MarketingApiConnectionStatus;
  lastVerifiedAt: string | null;
  lastErrorMessage: string | null;
  rateLimitRegainAccessAt: string | null;
  updatedAt: string | null;
}

export const DEFAULT_MARKETING_SETTINGS: MetaMarketingSettings = {
  tenantId: DEFAULT_TENANT_ID,
  adAccountId: "",
  accessToken: "",
  accountName: "",
  accountCurrency: "BDT",
  accountTimezoneName: "Asia/Dhaka",
  accountTimezoneOffsetHours: 6,
  attributionConfig: DEFAULT_ATTRIBUTION_CONFIG,
  status: "unconfigured",
};

export function maskSecret(secret?: string): string {
  return maskSecretSecure(secret);
}

/**
 * Normalizes Ad Account ID ensuring the "act_" prefix convention.
 */
export function normalizeAdAccountId(id?: string): string {
  if (!id) return "";
  const clean = id.trim();
  return clean.startsWith("act_") ? clean : `act_${clean}`;
}

/**
 * Retrieve decoupled Meta Marketing API settings from MongoDB.
 * Gracefully seeds from legacy pixel settings if meta_marketing is empty.
 */
export async function getMetaMarketingSettings(
  tenantId: string = DEFAULT_TENANT_ID
): Promise<MetaMarketingSettings> {
  await connectToDatabase();

  const doc = await Settings.findOne({
    tenantId,
    key: META_MARKETING_SETTINGS_KEY,
  }).lean();

  if (doc && doc.value) {
    const v = doc.value as Partial<MetaMarketingSettings>;
    return {
      tenantId,
      adAccountId: v.adAccountId || "",
      accessToken: typeof v.accessToken === "string" ? decryptTokenString(v.accessToken) : "",
      accountName: v.accountName || "",
      accountCurrency: v.accountCurrency || "BDT",
      accountTimezoneName: v.accountTimezoneName || "Asia/Dhaka",
      accountTimezoneOffsetHours: typeof v.accountTimezoneOffsetHours === "number" ? v.accountTimezoneOffsetHours : 6,
      accountStatus: v.accountStatus,
      attributionConfig: {
        actionAttributionWindows: Array.isArray(v.attributionConfig?.actionAttributionWindows)
          ? v.attributionConfig.actionAttributionWindows
          : DEFAULT_ATTRIBUTION_CONFIG.actionAttributionWindows,
        actionReportTime: v.attributionConfig?.actionReportTime === "impression" ? "impression" : "conversion",
      },
      status: v.status || (v.accessToken && v.adAccountId ? "connected" : "unconfigured"),
      lastVerifiedAt: v.lastVerifiedAt,
      lastErrorMessage: v.lastErrorMessage,
      rateLimitRegainAccessAt: v.rateLimitRegainAccessAt,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    };
  }

  // Fallback: check legacy pixel settings if marketing settings not yet created
  const legacyDoc = await Settings.findOne({
    tenantId,
    key: PIXEL_SETTINGS_KEY,
  }).lean();

  if (legacyDoc && legacyDoc.value) {
    const legacyVal = legacyDoc.value as Record<string, unknown>;
    const legacyAdAccount = typeof legacyVal.adAccountId === "string" ? legacyVal.adAccountId : "";
    const legacyToken =
      typeof legacyVal.marketingApiAccessToken === "string"
        ? decryptTokenString(legacyVal.marketingApiAccessToken)
        : "";

    if (legacyAdAccount || legacyToken) {
      return {
        tenantId,
        adAccountId: legacyAdAccount,
        accessToken: legacyToken,
        accountName: "",
        accountCurrency: "BDT",
        accountTimezoneName: "Asia/Dhaka",
        accountTimezoneOffsetHours: 6,
        attributionConfig: DEFAULT_ATTRIBUTION_CONFIG,
        status: legacyToken && legacyAdAccount ? "connected" : "unconfigured",
      };
    }
  }

  return { ...DEFAULT_MARKETING_SETTINGS, tenantId };
}

/**
 * Returns safe marketing settings for administrative UI consumption without exposing raw tokens.
 */
export async function getPublicMetaMarketingSettings(
  tenantId: string = DEFAULT_TENANT_ID
): Promise<PublicAdminMetaMarketingSettings> {
  const settings = await getMetaMarketingSettings(tenantId);
  const hasToken = Boolean(settings.accessToken && settings.accessToken.trim().length > 10);

  return {
    tenantId: settings.tenantId,
    adAccountId: settings.adAccountId,
    hasAccessToken: hasToken,
    maskedAccessToken: maskSecret(settings.accessToken),
    accountName: settings.accountName || "",
    accountCurrency: settings.accountCurrency || "BDT",
    accountTimezoneName: settings.accountTimezoneName || "Asia/Dhaka",
    accountTimezoneOffsetHours: settings.accountTimezoneOffsetHours ?? 6,
    accountStatus: typeof settings.accountStatus === "number" ? settings.accountStatus : null,
    attributionConfig: settings.attributionConfig,
    attributionConfigKey: computeAttributionConfigKey(settings.attributionConfig),
    status: settings.status,
    lastVerifiedAt: settings.lastVerifiedAt || null,
    lastErrorMessage: settings.lastErrorMessage || null,
    rateLimitRegainAccessAt: settings.rateLimitRegainAccessAt || null,
    updatedAt: settings.updatedAt || null,
  };
}

/**
 * Updates decoupled Meta Marketing API settings strictly under the "meta_marketing" key.
 */
export async function updateMetaMarketingSettings(
  tenantId: string = DEFAULT_TENANT_ID,
  patch: Partial<MetaMarketingSettings>
): Promise<MetaMarketingSettings> {
  await connectToDatabase();
  const current = await getMetaMarketingSettings(tenantId);

  const updated: MetaMarketingSettings = {
    ...current,
    ...patch,
    // Preserve existing token if empty string supplied in patch
    accessToken:
      typeof patch.accessToken === "string" && patch.accessToken.trim() !== ""
        ? patch.accessToken.trim()
        : current.accessToken,
    adAccountId:
      typeof patch.adAccountId === "string"
        ? patch.adAccountId.trim()
        : current.adAccountId,
    attributionConfig: patch.attributionConfig
      ? {
          actionAttributionWindows: Array.isArray(patch.attributionConfig.actionAttributionWindows)
            ? patch.attributionConfig.actionAttributionWindows
            : current.attributionConfig.actionAttributionWindows,
          actionReportTime:
            patch.attributionConfig.actionReportTime === "impression" ? "impression" : "conversion",
        }
      : current.attributionConfig,
    updatedAt: new Date().toISOString(),
  };

  const dbPayload = {
    ...updated,
    accessToken: encryptTokenString(updated.accessToken),
  };

  await Settings.findOneAndUpdate(
    { tenantId, key: META_MARKETING_SETTINGS_KEY },
    {
      $set: {
        value: dbPayload,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return updated;
}
