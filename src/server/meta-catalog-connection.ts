import { connectToDatabase } from "@/lib/mongodb";
import {
  MetaCatalogConfig,
  type IMetaCatalogConfig,
  type MetaCatalogConnectionStatus,
} from "@/models/MetaCatalogConfig";
import { callMetaGraphApi, MetaGraphApiError } from "@/lib/integrations/meta/client";
import { DEFAULT_TENANT_ID } from "./tenant";

export interface CatalogConnectionVerificationResult {
  ok: boolean;
  status: MetaCatalogConnectionStatus;
  catalogId: string;
  catalogName?: string;
  productCount?: number;
  businessId?: string;
  permissionsChecked: {
    catalogManagement: boolean;
    businessManagement: boolean;
  };
  error?: string;
  checkedAt: string;
}

const inMemoryConfigs = new Map<string, IMetaCatalogConfig>();

export async function getOrInitCatalogConfig(
  tenantId = DEFAULT_TENANT_ID
): Promise<IMetaCatalogConfig> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;

  try {
    await connectToDatabase();
    let config = await MetaCatalogConfig.findOne({ tenantId: safeTenant });
    if (!config) {
      config = await MetaCatalogConfig.create({
        tenantId: safeTenant,
        graphApiVersion: process.env.META_GRAPH_API_VERSION || "v22.0",
      });
    }
    return config;
  } catch (_err) {
    if (!inMemoryConfigs.has(safeTenant)) {
      const memDoc = new MetaCatalogConfig({
        tenantId: safeTenant,
        graphApiVersion: process.env.META_GRAPH_API_VERSION || "v22.0",
      });
      memDoc.save = async function () {
        return this;
      };
      inMemoryConfigs.set(safeTenant, memDoc);
    }
    return inMemoryConfigs.get(safeTenant)!;
  }
}

/**
 * Validates the user's access token and tests permissions against Meta Graph API.
 */
export async function checkTokenPermissions(
  accessToken: string,
  fetchFn?: typeof fetch
): Promise<{
  valid: boolean;
  hasCatalogManagement: boolean;
  hasBusinessManagement: boolean;
  error?: string;
}> {
  try {
    const response = await callMetaGraphApi<{
      data: Array<{ permission: string; status: string }>;
    }>("me/permissions", {
      accessToken,
      fetchFn,
      timeoutMs: 10_000,
    });

    const perms = response.data.data || [];
    const hasCatalogManagement = perms.some(
      (p) => p.permission === "catalog_management" && p.status === "granted"
    );
    const hasBusinessManagement = perms.some(
      (p) => p.permission === "business_management" && p.status === "granted"
    );

    return {
      valid: true,
      hasCatalogManagement,
      hasBusinessManagement,
    };
  } catch (err) {
    if (err instanceof MetaGraphApiError && err.category === "INVALID_TOKEN") {
      return {
        valid: false,
        hasCatalogManagement: false,
        hasBusinessManagement: false,
        error: "Access token is expired or invalid.",
      };
    }
    return {
      valid: false,
      hasCatalogManagement: false,
      hasBusinessManagement: false,
      error: err instanceof Error ? err.message : "Failed to verify token permissions.",
    };
  }
}

/**
 * Verifies catalog existence and permissions, updating database connection status.
 */
export async function verifyAndConnectCatalog(options: {
  tenantId?: string;
  catalogId?: string;
  businessId?: string;
  accessToken?: string;
  fetchFn?: typeof fetch;
}): Promise<CatalogConnectionVerificationResult> {
  const tenantId = options.tenantId?.trim() || DEFAULT_TENANT_ID;
  const checkedAt = new Date().toISOString();

  try {
    await connectToDatabase();
  } catch {
    // In-memory fallback
  }
  const config = await getOrInitCatalogConfig(tenantId);

  const cleanCatalogId = (options.catalogId !== undefined ? options.catalogId : config.catalogId).trim();
  const cleanBusinessId = (options.businessId !== undefined ? options.businessId : config.businessId).trim();

  let token = options.accessToken?.trim();
  if (!token) {
    token = config.getDecryptedToken();
  }

  if (!cleanCatalogId) {
    config.connectionStatus = "DISCONNECTED";
    config.lastConnectionCheckAt = new Date(checkedAt);
    config.lastConnectionError = "Catalog ID is required.";
    await config.save();

    return {
      ok: false,
      status: "DISCONNECTED",
      catalogId: "",
      permissionsChecked: { catalogManagement: false, businessManagement: false },
      error: "Catalog ID is required.",
      checkedAt,
    };
  }

  if (!token) {
    config.connectionStatus = "INVALID_CREDENTIALS";
    config.lastConnectionCheckAt = new Date(checkedAt);
    config.lastConnectionError = "Meta access token is missing.";
    await config.save();

    return {
      ok: false,
      status: "INVALID_CREDENTIALS",
      catalogId: cleanCatalogId,
      permissionsChecked: { catalogManagement: false, businessManagement: false },
      error: "Meta access token is missing.",
      checkedAt,
    };
  }

  // 1. Verify token & permissions
  const permCheck = await checkTokenPermissions(token, options.fetchFn);
  if (!permCheck.valid) {
    config.connectionStatus = "INVALID_CREDENTIALS";
    config.lastConnectionCheckAt = new Date(checkedAt);
    config.lastConnectionError = permCheck.error || "Invalid Meta access token.";
    await config.save();

    return {
      ok: false,
      status: "INVALID_CREDENTIALS",
      catalogId: cleanCatalogId,
      permissionsChecked: {
        catalogManagement: permCheck.hasCatalogManagement,
        businessManagement: permCheck.hasBusinessManagement,
      },
      error: permCheck.error || "Invalid Meta access token.",
      checkedAt,
    };
  }

  if (!permCheck.hasCatalogManagement) {
    config.connectionStatus = "PERMISSION_ERROR";
    config.lastConnectionCheckAt = new Date(checkedAt);
    config.lastConnectionError =
      "Missing required 'catalog_management' permission on Meta access token.";
    await config.save();

    return {
      ok: false,
      status: "PERMISSION_ERROR",
      catalogId: cleanCatalogId,
      permissionsChecked: {
        catalogManagement: false,
        businessManagement: permCheck.hasBusinessManagement,
      },
      error: "Missing required 'catalog_management' permission on Meta access token.",
      checkedAt,
    };
  }

  // 2. Fetch catalog details & check business ownership
  try {
    const catalogResponse = await callMetaGraphApi<{
      id: string;
      name?: string;
      product_count?: number;
      vertical?: string;
      business?: { id: string; name?: string };
    }>(cleanCatalogId, {
      accessToken: token,
      fetchFn: options.fetchFn,
      params: {
        fields: "id,name,business,product_count,vertical",
      },
      timeoutMs: 12_000,
    });

    const catData = catalogResponse.data;

    // Check business ID match if business ID was specified
    if (cleanBusinessId && catData.business?.id && catData.business.id !== cleanBusinessId) {
      const errorMsg = `Catalog belongs to Business ${catData.business.id}, but configured Business ID is ${cleanBusinessId}.`;
      config.connectionStatus = "PERMISSION_ERROR";
      config.lastConnectionCheckAt = new Date(checkedAt);
      config.lastConnectionError = errorMsg;
      await config.save();

      return {
        ok: false,
        status: "PERMISSION_ERROR",
        catalogId: cleanCatalogId,
        businessId: cleanBusinessId,
        permissionsChecked: {
          catalogManagement: true,
          businessManagement: permCheck.hasBusinessManagement,
        },
        error: errorMsg,
        checkedAt,
      };
    }

    // Success: update config
    config.catalogId = cleanCatalogId;
    if (cleanBusinessId) config.businessId = cleanBusinessId;
    if (options.accessToken) config.setAccessToken(options.accessToken);
    config.catalogName = catData.name || `Catalog ${cleanCatalogId}`;
    config.catalogProductCount = catData.product_count || 0;
    config.connectionStatus = "CONNECTED";
    config.lastConnectionCheckAt = new Date(checkedAt);
    config.lastConnectionError = null;
    await config.save();

    return {
      ok: true,
      status: "CONNECTED",
      catalogId: cleanCatalogId,
      catalogName: config.catalogName,
      productCount: config.catalogProductCount,
      businessId: catData.business?.id || cleanBusinessId,
      permissionsChecked: {
        catalogManagement: true,
        businessManagement: permCheck.hasBusinessManagement,
      },
      checkedAt,
    };
  } catch (err) {
    const errorMsg =
      err instanceof MetaGraphApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to access Meta Catalog.";

    config.connectionStatus =
      err instanceof MetaGraphApiError && err.category === "RESOURCE_NOT_FOUND"
        ? "INVALID_CREDENTIALS"
        : "ERROR";
    config.lastConnectionCheckAt = new Date(checkedAt);
    config.lastConnectionError = errorMsg;
    await config.save();

    return {
      ok: false,
      status: config.connectionStatus,
      catalogId: cleanCatalogId,
      permissionsChecked: {
        catalogManagement: true,
        businessManagement: permCheck.hasBusinessManagement,
      },
      error: errorMsg,
      checkedAt,
    };
  }
}
