import { validateAbsoluteUrl } from "@/lib/meta-catalog";
import { normalizeMetaCatalogId } from "./settings";
import type {
  ProductionFeedProbe,
  CatalogApiVerificationResult,
} from "./types";

function describeNetworkError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  if (cause?.code) return `${error.message} (${cause.code})`;
  if (cause?.message) return `${error.message} (${cause.message})`;
  return error.message || fallback;
}

export async function probeProductionFeed(
  url: string,
  timeoutMs = 12_000
): Promise<ProductionFeedProbe> {
  const checkedAt = new Date().toISOString();
  const safeUrl = validateAbsoluteUrl(url);

  if (!safeUrl) {
    return {
      state: "not-public",
      checkedAt,
      url,
      error:
        "A public HTTPS feed URL is required. Configure NEXT_PUBLIC_SITE_URL or META_CATALOG_BASE_URL with the production domain.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(safeUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/xml, text/xml, application/rss+xml;q=0.9, */*;q=0.1",
        "User-Agent": "ANGKON-Catalog-Diagnostics/1.0 (+https://angkon.net)",
      },
    });

    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const finalUrl = response.url || safeUrl;
    const finalUrlIsPublic = Boolean(validateAbsoluteUrl(finalUrl));
    const contentTypeIsXml = /(application|text)\/(xml|rss\+xml)/i.test(contentType);
    const validXml =
      /^\s*<\?xml/i.test(body) && /<rss[\s>]/i.test(body) && /<\/rss>/i.test(body);
    const itemCount = (body.match(/<item(?:\s|>)/gi) || []).length;
    const reachable =
      response.ok && validXml && contentTypeIsXml && finalUrlIsPublic;

    return {
      state: reachable ? "reachable" : "invalid-response",
      checkedAt,
      url: finalUrl,
      httpStatus: response.status,
      contentType,
      itemCount,
      bytes: Buffer.byteLength(body, "utf8"),
      validXml,
      error: reachable
        ? undefined
        : !response.ok
          ? `The public feed returned HTTP ${response.status}.`
          : !finalUrlIsPublic
            ? "The public feed redirected to a non-public or non-HTTPS URL."
            : !contentTypeIsXml
              ? `The feed responded with Content-Type "${contentType || "none"}" instead of an XML media type.`
              : "The URL responded, but the body is not a valid RSS 2.0 XML feed.",
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("abort"));
    return {
      state: "network-error",
      checkedAt,
      url: safeUrl,
      error: isTimeout
        ? `Public feed request timed out after ${timeoutMs}ms.`
        : describeNetworkError(error, "Network error reaching the public feed URL."),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyCatalogApiAccess(
  catalogId: string,
  accessToken: string,
  timeoutMs = 10_000
): Promise<CatalogApiVerificationResult> {
  const checkedAt = new Date().toISOString();
  const cleanId = normalizeMetaCatalogId(catalogId);
  const token = String(accessToken || "").trim();

  if (!cleanId || !token) {
    return {
      ok: false,
      catalogId: cleanId,
      error: "Both a Meta Catalog ID and a catalog API access token are required.",
      checkedAt,
    };
  }

  // Keep the credential out of the URL so it cannot leak into proxy or
  // platform request logs. Graph API accepts bearer authorization.
  const endpoint =
    `https://graph.facebook.com/v22.0/${encodeURIComponent(cleanId)}` +
    `?fields=${encodeURIComponent("id,name,product_count")}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const errorObject = payload.error as
      | { message?: string; fbtrace_id?: string }
      | undefined;

    if (!response.ok) {
      return {
        ok: false,
        catalogId: cleanId,
        httpStatus: response.status,
        fbtraceId: errorObject?.fbtrace_id,
        error: errorObject?.message || `Meta Graph API returned HTTP ${response.status}.`,
        checkedAt,
      };
    }

    return {
      ok: true,
      catalogId: cleanId,
      catalogName: typeof payload.name === "string" ? payload.name : undefined,
      productCount:
        typeof payload.product_count === "number" ? payload.product_count : undefined,
      httpStatus: response.status,
      checkedAt,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("abort"));
    return {
      ok: false,
      catalogId: cleanId,
      error: isTimeout
        ? `Meta Graph API request timed out after ${timeoutMs}ms.`
        : describeNetworkError(error, "Network error reaching Meta Graph API."),
      checkedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}
