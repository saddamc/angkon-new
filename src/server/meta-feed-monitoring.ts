import { connectToDatabase } from "@/lib/mongodb";
import {
  type MetaImportStatus,
  type IMetaImportStats,
} from "@/models/MetaCatalogConfig";
import { callMetaGraphApi, MetaGraphApiError } from "@/lib/integrations/meta/client";
import { getOrInitCatalogConfig } from "./meta-catalog-connection";
import { DEFAULT_TENANT_ID } from "./tenant";

export interface MetaUploadBatchSession {
  id: string;
  start_time?: string;
  end_time?: string;
  status?: string; // "COMPLETED", "IN_PROGRESS", "FAILED", etc.
  num_rows_read?: number;
  num_rows_accepted?: number;
  num_rows_rejected?: number;
  error_count?: number;
  errors?: Array<{
    code?: number;
    message?: string;
    description?: string;
    severity?: string;
  }>;
}

export interface FeedImportStatusResult {
  ok: boolean;
  productFeedId: string;
  importStatus: MetaImportStatus;
  metaSessionStatus?: string;
  startTime?: string;
  endTime?: string;
  stats: IMetaImportStats;
  lastSuccessfulImportAt?: string | null;
  error?: string;
  errorSamples?: Array<{ message: string; severity?: string }>;
  checkedAt: string;
}

/**
 * Retrieves the latest feed upload session metrics from Meta Commerce Manager.
 */
export async function checkFeedImportStatus(options: {
  tenantId?: string;
  fetchFn?: typeof fetch;
}): Promise<FeedImportStatusResult> {
  const tenantId = options.tenantId?.trim() || DEFAULT_TENANT_ID;
  const checkedAt = new Date().toISOString();
  try {
    await connectToDatabase();
  } catch {
    // In-memory fallback
  }

  const config = await getOrInitCatalogConfig(tenantId);
  const feedId = config.productFeedId?.trim();
  const token = config.getDecryptedToken();

  if (!feedId) {
    return {
      ok: false,
      productFeedId: "",
      importStatus: "NOT_STARTED",
      stats: { productsProcessed: 0, productsAccepted: 0, productsRejected: 0, errorCount: 0 },
      error: "No registered product feed found. Please register the feed first.",
      checkedAt,
    };
  }

  if (!token) {
    return {
      ok: false,
      productFeedId: feedId,
      importStatus: "FAILED",
      stats: { productsProcessed: 0, productsAccepted: 0, productsRejected: 0, errorCount: 0 },
      error: "Meta access token is missing.",
      checkedAt,
    };
  }

  try {
    const uploadsResponse = await callMetaGraphApi<{
      data: MetaUploadBatchSession[];
    }>(`${feedId}/uploads`, {
      accessToken: token,
      fetchFn: options.fetchFn,
      params: {
        fields:
          "id,start_time,end_time,status,num_rows_read,num_rows_accepted,num_rows_rejected,error_count,errors",
        limit: 1,
      },
      timeoutMs: 12_000,
    });

    const uploads = uploadsResponse.data.data || [];
    if (uploads.length === 0) {
      config.lastImportStatus = "NOT_STARTED";
      config.lastImportError = null;
      await config.save();

      return {
        ok: true,
        productFeedId: feedId,
        importStatus: "NOT_STARTED",
        stats: { productsProcessed: 0, productsAccepted: 0, productsRejected: 0, errorCount: 0 },
        checkedAt,
      };
    }

    const latest = uploads[0];
    const processed = latest.num_rows_read || 0;
    const accepted = latest.num_rows_accepted || 0;
    const rejected = latest.num_rows_rejected || 0;
    const errorCount = latest.error_count || (latest.errors ? latest.errors.length : 0);
    const metaStatus = (latest.status || "").toUpperCase();

    let computedStatus: MetaImportStatus = "NOT_STARTED";
    if (metaStatus === "IN_PROGRESS" || metaStatus === "PROCESSING") {
      computedStatus = "RUNNING";
    } else if (metaStatus === "COMPLETED") {
      if (rejected > 0 && accepted > 0) {
        computedStatus = "PARTIAL";
      } else if (rejected > 0 && accepted === 0) {
        computedStatus = "FAILED";
      } else {
        computedStatus = "SUCCESS";
      }
    } else if (metaStatus === "FAILED" || metaStatus === "ERROR") {
      computedStatus = "FAILED";
    }

    const stats: IMetaImportStats = {
      productsProcessed: processed,
      productsAccepted: accepted,
      productsRejected: rejected,
      errorCount,
    };

    config.lastImportStatus = computedStatus;
    config.lastImportStats = stats;

    if (accepted > 0 && latest.end_time) {
      config.lastSuccessfulImportAt = new Date(latest.end_time);
    } else if (accepted > 0 && !config.lastSuccessfulImportAt) {
      config.lastSuccessfulImportAt = new Date();
    }

    const errorSamples = (latest.errors || []).slice(0, 5).map((e) => ({
      message: e.message || e.description || "Import warning or error",
      severity: e.severity,
    }));

    if (errorSamples.length > 0) {
      config.lastImportError = errorSamples[0].message;
    } else if (computedStatus === "FAILED") {
      config.lastImportError = `Import failed with Meta status ${metaStatus}.`;
    } else {
      config.lastImportError = null;
    }

    await config.save();

    return {
      ok: true,
      productFeedId: feedId,
      importStatus: computedStatus,
      metaSessionStatus: metaStatus,
      startTime: latest.start_time,
      endTime: latest.end_time,
      stats,
      lastSuccessfulImportAt: config.lastSuccessfulImportAt
        ? config.lastSuccessfulImportAt.toISOString()
        : null,
      error: config.lastImportError || undefined,
      errorSamples: errorSamples.length > 0 ? errorSamples : undefined,
      checkedAt,
    };
  } catch (err) {
    const errorMsg =
      err instanceof MetaGraphApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to query Meta feed upload status.";

    return {
      ok: false,
      productFeedId: feedId,
      importStatus: config.lastImportStatus || "FAILED",
      stats: config.lastImportStats || {
        productsProcessed: 0,
        productsAccepted: 0,
        productsRejected: 0,
        errorCount: 0,
      },
      error: errorMsg,
      checkedAt,
    };
  }
}
