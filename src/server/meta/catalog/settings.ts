import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { maskSecret } from "@/server/meta/pixel/pixel-settings";
import { DEFAULT_TENANT_ID } from "@/server/auth/tenant";
import {
  encryptTokenString,
  decryptTokenString,
} from "@/lib/security/token-encryption";
import type {
  MetaCatalogSettings,
  PublicMetaCatalogSettings,
  MetaCatalogConnectionState,
} from "./types";

export const META_CATALOG_SETTINGS_KEY = "meta_catalog";

export const DEFAULT_META_CATALOG_SETTINGS: MetaCatalogSettings = {
  tenantId: DEFAULT_TENANT_ID,
  catalogId: "",
  catalogApiToken: "",
  businessId: "",
};

const catalogSettingsCache = new Map<string, { data: MetaCatalogSettings; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

export function invalidateMetaCatalogSettingsCache(tenantId?: string): void {
  if (tenantId) {
    catalogSettingsCache.delete(tenantId);
  } else {
    catalogSettingsCache.clear();
  }
}

export function normalizeMetaCatalogId(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^catalog_/i, "").trim();
}

export function normalizeMetaCatalogSettings(
  raw: unknown,
  tenantId = DEFAULT_TENANT_ID
): MetaCatalogSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const resolvedTenant =
    typeof source.tenantId === "string" && source.tenantId.trim()
      ? source.tenantId.trim()
      : tenantId || DEFAULT_TENANT_ID;

  return {
    tenantId: resolvedTenant,
    catalogId: normalizeMetaCatalogId(source.catalogId),
    catalogApiToken:
      typeof source.catalogApiToken === "string"
        ? decryptTokenString(source.catalogApiToken.trim())
        : "",
    businessId: typeof source.businessId === "string" ? source.businessId.trim() : "",
    catalogName: typeof source.catalogName === "string" ? source.catalogName : undefined,
    metaProductCount:
      typeof source.metaProductCount === "number" && Number.isFinite(source.metaProductCount)
        ? source.metaProductCount
        : undefined,
    lastVerifiedAt:
      typeof source.lastVerifiedAt === "string" ? source.lastVerifiedAt : undefined,
    lastVerificationError:
      typeof source.lastVerificationError === "string"
        ? source.lastVerificationError
        : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export async function getMetaCatalogSettings(
  tenantId = DEFAULT_TENANT_ID,
  bypassCache = false
): Promise<MetaCatalogSettings> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;
  const now = Date.now();

  if (!bypassCache) {
    const cached = catalogSettingsCache.get(safeTenant);
    if (cached && now < cached.expiresAt) return cached.data;
  }

  try {
    await connectToDatabase();

    let doc = (await Settings.findOne(
      { tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY },
      null,
      { strict: false }
    )
      .lean()
      .catch(() => null)) as Record<string, unknown> | null;

    if (!doc) {
      doc = await Settings.collection
        .findOne({ tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY })
        .catch(() => null);
    }

    if (doc?.value) {
      const normalized = normalizeMetaCatalogSettings(doc.value, safeTenant);
      catalogSettingsCache.set(safeTenant, { data: normalized, expiresAt: now + CACHE_TTL_MS });
      return normalized;
    }
  } catch (error) {
    console.warn("Meta catalog settings unavailable in DB, using defaults:", error);
  }

  const fallback = { ...DEFAULT_META_CATALOG_SETTINGS, tenantId: safeTenant };
  catalogSettingsCache.set(safeTenant, { data: fallback, expiresAt: now + CACHE_TTL_MS });
  return fallback;
}

export async function saveMetaCatalogSettings(
  settings: Partial<MetaCatalogSettings>,
  tenantId = DEFAULT_TENANT_ID
): Promise<MetaCatalogSettings> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;
  await connectToDatabase();

  const current = await getMetaCatalogSettings(safeTenant, true);

  let nextToken = current.catalogApiToken || "";
  if (typeof settings.catalogApiToken === "string") {
    const raw = settings.catalogApiToken.trim();
    if (!raw.includes("••••") && !raw.includes("***")) {
      nextToken = raw;
    }
  }

  const nextCatalogId =
    settings.catalogId !== undefined
      ? normalizeMetaCatalogId(settings.catalogId)
      : current.catalogId || "";

  const credentialsChanged =
    nextCatalogId !== (current.catalogId || "") || nextToken !== (current.catalogApiToken || "");

  const verificationTouched =
    Object.prototype.hasOwnProperty.call(settings, "lastVerifiedAt") ||
    Object.prototype.hasOwnProperty.call(settings, "lastVerificationError") ||
    Object.prototype.hasOwnProperty.call(settings, "catalogName") ||
    Object.prototype.hasOwnProperty.call(settings, "metaProductCount");

  const normalized = normalizeMetaCatalogSettings(
    {
      ...current,
      ...settings,
      tenantId: safeTenant,
      catalogId: nextCatalogId,
      catalogApiToken: nextToken,
      lastVerifiedAt: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.lastVerifiedAt
          : current.lastVerifiedAt,
      lastVerificationError: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.lastVerificationError
          : current.lastVerificationError,
      catalogName: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.catalogName
          : current.catalogName,
      metaProductCount: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.metaProductCount
          : current.metaProductCount,
      updatedAt: new Date().toISOString(),
    },
    safeTenant
  );

  const dbPayload = {
    ...normalized,
    catalogApiToken: encryptTokenString(normalized.catalogApiToken),
  };

  try {
    await Settings.findOneAndUpdate(
      { tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY },
      {
        $set: {
          tenantId: safeTenant,
          key: META_CATALOG_SETTINGS_KEY,
          value: dbPayload,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, strict: false }
    );
  } catch (dbErr) {
    console.warn(
      "[Meta Catalog] Mongoose settings update failed, falling back to direct collection update:",
      dbErr
    );
    await Settings.collection.updateOne(
      { tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY },
      {
        $set: {
          tenantId: safeTenant,
          key: META_CATALOG_SETTINGS_KEY,
          value: dbPayload,
        },
      },
      { upsert: true }
    );
  }

  invalidateMetaCatalogSettingsCache(safeTenant);
  return normalized;
}

export async function recordCatalogVerification(
  tenantId: string,
  result: {
    ok: boolean;
    catalogName?: string;
    productCount?: number;
    error?: string;
  }
): Promise<MetaCatalogSettings> {
  return saveMetaCatalogSettings(
    {
      lastVerifiedAt: result.ok ? new Date().toISOString() : undefined,
      lastVerificationError: result.ok ? undefined : result.error || "Verification failed",
      catalogName: result.ok ? result.catalogName : undefined,
      metaProductCount: result.ok ? result.productCount : undefined,
    },
    tenantId
  );
}

export function getPublicMetaCatalogSettings(
  settings: MetaCatalogSettings
): PublicMetaCatalogSettings {
  const hasCatalogId = Boolean(settings.catalogId);
  const hasToken = Boolean(settings.catalogApiToken);
  const apiConfigured = hasCatalogId && hasToken;

  let connectionState: MetaCatalogConnectionState = "not-configured";
  let connectionLabel = "Not Configured";
  let connectionDetail =
    "Catalog API management is optional. Scheduled-feed setup does not require a Meta token.";

  if (!hasCatalogId && hasToken) {
    connectionState = "credential-only";
    connectionLabel = "Catalog ID Required";
    connectionDetail = "A catalog API token is saved, but no Meta Catalog ID is configured.";
  } else if (hasCatalogId && !hasToken) {
    connectionState = "catalog-id-only";
    connectionLabel = "Credential Required";
    connectionDetail =
      "Catalog ID saved. Catalog API verification requires a separate catalog_management token.";
  } else if (apiConfigured) {
    if (settings.lastVerifiedAt && !settings.lastVerificationError) {
      connectionState = "verified";
      connectionLabel = "API Access Verified";
      connectionDetail = "Meta Graph API confirmed access to this catalog. Import status is still Meta-owned.";
    } else if (settings.lastVerificationError) {
      connectionState = "error";
      connectionLabel = "Verification Failed";
      connectionDetail = settings.lastVerificationError;
    } else {
      connectionState = "configured-untested";
      connectionLabel = "Configured (Not Verified)";
      connectionDetail =
        "Credentials saved. Run Verify API Access to confirm catalog_management permission.";
    }
  }

  return {
    tenantId: settings.tenantId || DEFAULT_TENANT_ID,
    catalogId: settings.catalogId,
    businessId: settings.businessId,
    hasCatalogApiToken: hasToken,
    maskedCatalogApiToken: maskSecret(settings.catalogApiToken),
    apiConfigured,
    connectionState,
    connectionLabel,
    connectionDetail,
    catalogName: settings.catalogName,
    metaProductCount: settings.metaProductCount,
    lastVerifiedAt: settings.lastVerifiedAt,
    lastVerificationError: settings.lastVerificationError,
    updatedAt: settings.updatedAt,
  };
}
