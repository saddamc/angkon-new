/**
 * Configuration health derivation for the Meta Suite settings console.
 *
 * Kept free of JSX and React so the readiness rules can be unit-tested
 * directly. The console component renders whatever this module returns.
 */

export type SettingsSectionId =
  | "general"
  | "dataset"
  | "ads"
  | "capi"
  | "catalog"
  | "domain"
  | "security"
  | "sync";

export type HealthState = "ready" | "partial" | "missing";

export interface HealthItem {
  id: SettingsSectionId;
  label: string;
  state: HealthState;
  /** The one fact that matters for this subsystem. */
  detail: string;
}

/**
 * Structural subset of the settings payload this console needs.
 *
 * Every block is optional: the settings API is versioned independently, and a
 * temporarily missing block must degrade to "not configured" rather than throw
 * and blank the page.
 */
export interface SettingsHealthData {
  general?: { businessId: string; appId: string; hasAppSecret: boolean; status: string };
  dataset?: { pixelId: string; enabled: boolean; status: string };
  ads?: { adAccountId: string; hasMarketingToken: boolean; status: string; lastVerifiedAt: string | null };
  capi?: { hasCapiToken: boolean; status: string };
  catalog?: { catalogId: string; hasFeedKey: boolean; productCount: number; status: string };
  domain?: { domain: string; status: string; lastVerifiedAt: string | null };
  security?: {
    encryptionAlgorithm: string;
    capiTokenEncrypted: boolean;
    marketingTokenEncrypted: boolean;
    lastCredentialUpdate: string | null;
  };
  sync?: {
    status: string;
    lastSuccessfulSync: string | null;
    nextScheduledSync: string | null;
    durationMs: number;
    lastError: string | null;
  };
}

export const HEALTH_STATE_LABEL: Record<HealthState, string> = {
  ready: "Ready",
  partial: "Partial",
  missing: "Not set",
};

/** Deterministic UTC stamp — avoids server/client hydration drift. */
export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(
    parsed.getUTCDate()
  )} ${pad(parsed.getUTCHours())}:${pad(parsed.getUTCMinutes())} UTC`;
}

/** Shortens a long identifier so it fits a tile without wrapping. */
export function truncateMiddle(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const EMPTY_HEALTH: HealthItem[] = [
  { id: "general", label: "Business Portfolio", state: "missing", detail: "—" },
  { id: "dataset", label: "Dataset & Pixel", state: "missing", detail: "—" },
  { id: "ads", label: "Ads & Marketing API", state: "missing", detail: "—" },
  { id: "capi", label: "Conversions API", state: "missing", detail: "—" },
  { id: "catalog", label: "Catalog & Feed", state: "missing", detail: "—" },
  { id: "domain", label: "Domain Verification", state: "missing", detail: "—" },
  { id: "security", label: "Security & Encryption", state: "missing", detail: "—" },
  { id: "sync", label: "Auto-Synchronization", state: "missing", detail: "—" },
];

/**
 * Derives the eight subsystem states from the saved settings payload.
 *
 * A subsystem is `ready` only when everything it needs is present; `partial`
 * when some prerequisite is saved; `missing` when nothing usable is stored.
 */
export function buildSettingsHealth(data: SettingsHealthData | null): HealthItem[] {
  if (!data) return EMPTY_HEALTH.map((item) => ({ ...item }));

  // Normalise each block once. A missing block degrades to "nothing saved"
  // instead of throwing on property access.
  const general = data.general ?? { businessId: "", appId: "", hasAppSecret: false, status: "" };
  const dataset = data.dataset ?? { pixelId: "", enabled: false, status: "" };
  const ads = data.ads ?? {
    adAccountId: "",
    hasMarketingToken: false,
    status: "",
    lastVerifiedAt: null,
  };
  const capi = data.capi ?? { hasCapiToken: false, status: "" };
  const catalog = data.catalog ?? {
    catalogId: "",
    hasFeedKey: false,
    productCount: 0,
    status: "",
  };
  const domain = data.domain ?? { domain: "", status: "", lastVerifiedAt: null };
  const security = data.security ?? {
    encryptionAlgorithm: "",
    capiTokenEncrypted: false,
    marketingTokenEncrypted: false,
    lastCredentialUpdate: null,
  };
  const sync = data.sync ?? {
    status: "",
    lastSuccessfulSync: null,
    nextScheduledSync: null,
    durationMs: 0,
    lastError: null,
  };

  const businessComplete = Boolean(general.businessId && general.appId && general.hasAppSecret);
  const businessPartial = Boolean(general.businessId || general.appId);

  const adsComplete = Boolean(ads.adAccountId && ads.hasMarketingToken);
  const adsPartial = Boolean(ads.adAccountId || ads.hasMarketingToken);

  const catalogComplete = Boolean(catalog.catalogId && catalog.hasFeedKey);
  const catalogPartial = Boolean(catalog.catalogId || catalog.hasFeedKey);

  const tokensEncrypted = security.capiTokenEncrypted && security.marketingTokenEncrypted;
  const anyTokenEncrypted = security.capiTokenEncrypted || security.marketingTokenEncrypted;

  return [
    {
      id: "general",
      label: "Business Portfolio",
      state: businessComplete ? "ready" : businessPartial ? "partial" : "missing",
      // When incomplete, name the missing piece instead of repeating an ID.
      detail: businessComplete
        ? truncateMiddle(general.businessId, 8, 4)
        : businessPartial
          ? "App secret not saved"
          : "No Business ID",
    },
    {
      id: "dataset",
      label: "Dataset & Pixel",
      state: dataset.pixelId ? (dataset.enabled ? "ready" : "partial") : "missing",
      detail: dataset.pixelId
        ? dataset.enabled
          ? `Pixel ${truncateMiddle(dataset.pixelId, 6, 4)}`
          : "Tracking disabled"
        : "No dataset",
    },
    {
      id: "ads",
      label: "Ads & Marketing API",
      state: adsComplete ? "ready" : adsPartial ? "partial" : "missing",
      detail: adsComplete
        ? truncateMiddle(ads.adAccountId, 8, 4)
        : adsPartial
          ? "Ad account or token missing"
          : "No ad account",
    },
    {
      id: "capi",
      label: "Conversions API",
      state: capi.hasCapiToken ? "ready" : "missing",
      detail: capi.hasCapiToken ? "Token stored" : "No CAPI token",
    },
    {
      id: "catalog",
      label: "Catalog & Feed",
      state: catalogComplete ? "ready" : catalogPartial ? "partial" : "missing",
      detail: catalogComplete
        ? `${catalog.productCount} product${catalog.productCount === 1 ? "" : "s"}`
        : catalogPartial
          ? "Feed key or catalog missing"
          : "No catalog",
    },
    {
      id: "domain",
      label: "Domain Verification",
      state: domain.status === "Verified" ? "ready" : domain.domain ? "partial" : "missing",
      detail: domain.status === "Verified" ? domain.domain : domain.domain ? "Not verified yet" : "No domain",
    },
    {
      id: "security",
      label: "Security & Encryption",
      state: tokensEncrypted ? "ready" : anyTokenEncrypted ? "partial" : "missing",
      detail: tokensEncrypted
        ? security.encryptionAlgorithm || "Encrypted"
        : anyTokenEncrypted
          ? "Some tokens unencrypted"
          : "No encrypted tokens",
    },
    {
      id: "sync",
      label: "Auto-Synchronization",
      state: sync.lastSuccessfulSync ? (sync.lastError ? "partial" : "ready") : "missing",
      detail: sync.lastSuccessfulSync
        ? sync.lastError
          ? "Last run reported an error"
          : formatStamp(sync.lastSuccessfulSync)
        : "Never synced",
    },
  ];
}

/**
 * Readiness score for a health list. A fully configured subsystem counts as 1,
 * a partially configured one as 0.5 — so a half-set-up integration cannot make
 * the suite look production-ready.
 */
export function computeReadiness(items: HealthItem[]): {
  score: number;
  ratio: number;
  percent: number;
  readyCount: number;
  total: number;
} {
  const total = items.length;
  const score = items.reduce(
    (sum, item) => sum + (item.state === "ready" ? 1 : item.state === "partial" ? 0.5 : 0),
    0
  );
  const ratio = total > 0 ? score / total : 0;
  return {
    score,
    ratio,
    percent: Math.round(ratio * 100),
    readyCount: items.filter((item) => item.state === "ready").length,
    total,
  };
}
