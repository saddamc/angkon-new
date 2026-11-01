import { connectToDatabase } from "@/lib/mongodb";
import {
  type IMetaFeedSchedule,
  type MetaFeedRegistrationStatus,
} from "@/models/MetaCatalogConfig";
import { callMetaGraphApi, MetaGraphApiError } from "@/lib/integrations/meta/client";
import { getOrInitCatalogConfig } from "./meta-catalog-connection";
import { DEFAULT_TENANT_ID } from "./tenant";

export interface RegisterProductFeedOptions {
  tenantId?: string;
  feedName?: string;
  feedSchedule?: Partial<IMetaFeedSchedule>;
  feedUrl?: string;
  fetchFn?: typeof fetch;
}

export interface RegisterProductFeedResult {
  ok: boolean;
  status: MetaFeedRegistrationStatus;
  productFeedId?: string;
  action?: "created_new" | "bound_existing" | "updated_existing";
  feedName: string;
  feedUrl: string;
  schedule: IMetaFeedSchedule;
  error?: string;
}

function resolveProductionFeedUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim()) return customUrl.trim();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.angkon.net";
  const baseUrl = siteUrl.replace(/\/+$/, "");
  const feedKey = process.env.META_CATALOG_FEED_KEY?.trim() || "";

  if (feedKey) {
    return `${baseUrl}/api/meta/catalog-feed?feed_key=${encodeURIComponent(feedKey)}`;
  }
  return `${baseUrl}/api/meta/catalog-feed`;
}

interface MetaProductFeedListItem {
  id: string;
  name?: string;
  schedule?: {
    interval?: string;
    url?: string;
    hour?: number;
    minute?: number;
  };
}

/**
 * Registers a scheduled XML product feed with Meta Commerce Manager,
 * preventing duplicate feed registration on repeated calls.
 */
export async function registerOrUpdateProductFeed(
  options: RegisterProductFeedOptions = {}
): Promise<RegisterProductFeedResult> {
  const tenantId = options.tenantId?.trim() || DEFAULT_TENANT_ID;
  try {
    await connectToDatabase();
  } catch {
    // In-memory fallback
  }

  const config = await getOrInitCatalogConfig(tenantId);
  const catalogId = config.catalogId?.trim();
  const token = config.getDecryptedToken();

  const feedName = options.feedName?.trim() || config.feedName || "ANGKON Production Catalog Feed";
  const resolvedFeedUrl = resolveProductionFeedUrl(options.feedUrl || config.feedUrl);

  const resolvedSchedule: IMetaFeedSchedule = {
    interval: options.feedSchedule?.interval || config.feedSchedule?.interval || "DAILY",
    hour: options.feedSchedule?.hour !== undefined ? options.feedSchedule.hour : (config.feedSchedule?.hour ?? 4),
    minute: options.feedSchedule?.minute !== undefined ? options.feedSchedule.minute : (config.feedSchedule?.minute ?? 0),
  };

  if (!catalogId || !token) {
    return {
      ok: false,
      status: "FAILED",
      feedName,
      feedUrl: resolvedFeedUrl,
      schedule: resolvedSchedule,
      error: "Catalog connection is required before registering a feed. Please verify catalog access first.",
    };
  }

  try {
    // 1. Inspect existing feeds to prevent duplicates
    let existingFeedId: string | null = null;
    try {
      const feedsListResponse = await callMetaGraphApi<{
        data: MetaProductFeedListItem[];
      }>(`${catalogId}/product_feeds`, {
        accessToken: token,
        fetchFn: options.fetchFn,
        params: { fields: "id,name,schedule" },
        timeoutMs: 12_000,
      });

      const existingFeeds = feedsListResponse.data.data || [];

      // Check matching by URL or name or current saved productFeedId
      const match = existingFeeds.find((feed) => {
        if (config.productFeedId && feed.id === config.productFeedId) return true;
        if (feed.schedule?.url && feed.schedule.url === resolvedFeedUrl) return true;
        if (feed.name && feed.name.trim().toLowerCase() === feedName.toLowerCase()) return true;
        return false;
      });

      if (match) {
        existingFeedId = match.id;
      }
    } catch (listErr) {
      console.warn("[Meta Product Feeds] Could not query existing feeds, proceeding with create:", listErr);
    }

    // 2. If matching feed exists, update schedule instead of creating a duplicate
    if (existingFeedId) {
      try {
        await callMetaGraphApi<{ success: boolean }>(existingFeedId, {
          method: "POST",
          accessToken: token,
          fetchFn: options.fetchFn,
          body: {
            name: feedName,
            schedule: JSON.stringify({
              interval: resolvedSchedule.interval,
              url: resolvedFeedUrl,
              hour: resolvedSchedule.hour,
              minute: resolvedSchedule.minute,
            }),
          },
          timeoutMs: 15_000,
        });

        config.productFeedId = existingFeedId;
        config.feedName = feedName;
        config.feedUrl = resolvedFeedUrl;
        config.feedSchedule = resolvedSchedule;
        config.feedRegistrationStatus = "ACTIVE";
        await config.save();

        return {
          ok: true,
          status: "ACTIVE",
          productFeedId: existingFeedId,
          action: "updated_existing",
          feedName,
          feedUrl: resolvedFeedUrl,
          schedule: resolvedSchedule,
        };
      } catch (_updateErr) {
        // If update failed, bind to it anyway
        config.productFeedId = existingFeedId;
        config.feedName = feedName;
        config.feedUrl = resolvedFeedUrl;
        config.feedSchedule = resolvedSchedule;
        config.feedRegistrationStatus = "ACTIVE";
        await config.save();

        return {
          ok: true,
          status: "ACTIVE",
          productFeedId: existingFeedId,
          action: "bound_existing",
          feedName,
          feedUrl: resolvedFeedUrl,
          schedule: resolvedSchedule,
        };
      }
    }

    // 3. Register new scheduled feed
    const createResponse = await callMetaGraphApi<{ id: string }>(
      `${catalogId}/product_feeds`,
      {
        method: "POST",
        accessToken: token,
        fetchFn: options.fetchFn,
        body: {
          name: feedName,
          feed_type: "PRODUCTS",
          schedule: JSON.stringify({
            interval: resolvedSchedule.interval,
            url: resolvedFeedUrl,
            hour: resolvedSchedule.hour,
            minute: resolvedSchedule.minute,
          }),
        },
        timeoutMs: 15_000,
      }
    );

    const newFeedId = createResponse.data.id;
    if (!newFeedId) {
      throw new Error("Meta did not return a product feed ID.");
    }

    config.productFeedId = newFeedId;
    config.feedName = feedName;
    config.feedUrl = resolvedFeedUrl;
    config.feedSchedule = resolvedSchedule;
    config.feedRegistrationStatus = "ACTIVE";
    await config.save();

    return {
      ok: true,
      status: "ACTIVE",
      productFeedId: newFeedId,
      action: "created_new",
      feedName,
      feedUrl: resolvedFeedUrl,
      schedule: resolvedSchedule,
    };
  } catch (err) {
    const errorMsg =
      err instanceof MetaGraphApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to register scheduled product feed with Meta.";

    config.feedRegistrationStatus = "FAILED";
    await config.save();

    return {
      ok: false,
      status: "FAILED",
      feedName,
      feedUrl: resolvedFeedUrl,
      schedule: resolvedSchedule,
      error: errorMsg,
    };
  }
}

/**
 * Disconnects or removes a registered product feed.
 */
export async function disconnectProductFeed(options: {
  tenantId?: string;
  deleteOnMeta?: boolean;
  fetchFn?: typeof fetch;
}): Promise<{ ok: boolean; message: string }> {
  const tenantId = options.tenantId?.trim() || DEFAULT_TENANT_ID;
  try {
    await connectToDatabase();
  } catch {
    // In-memory fallback
  }

  const config = await getOrInitCatalogConfig(tenantId);
  const feedId = config.productFeedId;
  const token = config.getDecryptedToken();

  if (options.deleteOnMeta && feedId && token) {
    try {
      await callMetaGraphApi<{ success: boolean }>(feedId, {
        method: "DELETE",
        accessToken: token,
        fetchFn: options.fetchFn,
        timeoutMs: 10_000,
      });
    } catch (err) {
      console.warn("[Meta Product Feeds] Could not delete feed on Meta:", err);
    }
  }

  config.productFeedId = "";
  config.feedRegistrationStatus = "UNREGISTERED";
  await config.save();

  return { ok: true, message: "Feed registration removed successfully." };
}
