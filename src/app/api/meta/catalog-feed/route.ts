import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { generateMetaCatalogFeed } from "@/lib/integrations/meta";
import { buildCatalogVisibilityFilter } from "@/server/meta-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function extractProvidedKey(request: NextRequest): string {
  const queryKey =
    request.nextUrl.searchParams.get("feed_key") ||
    request.nextUrl.searchParams.get("key");
  if (queryKey) return queryKey.trim();

  const headerKey = request.headers.get("x-feed-key");
  if (headerKey) return headerKey.trim();

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function isKeyAuthorized(providedKey: string): boolean {
  const expectedKey = process.env.META_CATALOG_FEED_KEY?.trim();

  // If a dedicated feed key is configured in env, strictly require matching
  if (expectedKey) {
    return Boolean(providedKey && providedKey === expectedKey);
  }

  // In non-production environments without a configured key, allow access for testing/preview
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  // In production, if no key was defined in environment, require explicit authorization key
  return false;
}

/**
 * Machine-readable reason for a failed fetch. Deliberately coarse: it tells an
 * operator what went wrong without echoing driver messages, connection strings,
 * or secrets.
 */
type FeedFailureReason = "database-unavailable" | "no-eligible-products" | "internal-error";

const UNAVAILABLE_MESSAGE = "ANGKON catalog feed is temporarily unavailable. Please retry shortly.";

/**
 * Meta treats an unparseable or failing feed as "retry later", but treats a
 * well-formed *empty* feed as "delete every product". Every failure path below
 * therefore answers 503 with an empty channel instead of emitting zero <item>
 * entries inside an otherwise valid feed.
 */
function unavailableResponse(format: string, reason: FeedFailureReason): NextResponse {
  const sharedHeaders = {
    "Cache-Control": "no-store",
    "Retry-After": "300",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Catalog-Reason": reason,
  };

  if (format === "json") {
    return NextResponse.json(
      { error: UNAVAILABLE_MESSAGE, reason, generatedAt: new Date().toISOString() },
      { status: 503, headers: sharedHeaders }
    );
  }

  const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ANGKON Product Catalog Feed</title>
    <description>${UNAVAILABLE_MESSAGE}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`;

  return new NextResponse(errorXml, {
    status: 503,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      ...sharedHeaders,
    },
  });
}

type ProductQueryResult =
  | { ok: true; products: unknown[] }
  | { ok: false; reason: FeedFailureReason };

/**
 * Loads every Meta-eligible product using the canonical visibility filter that
 * the Stage 3A feed already relies on.
 *
 * Important: `src/models/Product.ts` declares no `status` field, so a query such
 * as `{ status: { $in: ["publish", "published"] } }` matches zero documents and
 * used to fall through to a baked-in snapshot of the original 7 products.
 * `buildCatalogVisibilityFilter()` treats a missing field as "not restricted",
 * which is what this schema actually requires.
 *
 * A zero-row result is reported as a failure rather than an empty catalog, so
 * Meta cannot interpret it as an instruction to delete every product.
 */
async function queryEligibleProducts(): Promise<ProductQueryResult> {
  try {
    await connectToDatabase();

    const products = await Product.collection
      .find(buildCatalogVisibilityFilter())
      .sort({ id: -1 })
      .toArray();

    if (products.length === 0) {
      console.warn(
        "[Meta Catalog Feed] database returned zero eligible products; refusing to serve a static snapshot."
      );
      return { ok: false, reason: "no-eligible-products" };
    }

    return { ok: true, products };
  } catch (dbErr) {
    // Driver detail stays in server logs; feed consumers only ever see the
    // generic message produced by `unavailableResponse`.
    console.warn(
      "[Meta Catalog Feed] product query failed:",
      dbErr instanceof Error ? dbErr.message : dbErr
    );
    return { ok: false, reason: "database-unavailable" };
  }
}

export async function GET(request: NextRequest) {
  const providedKey = extractProvidedKey(request);
  const isAuthorized = isKeyAuthorized(providedKey);

  if (!isAuthorized) {
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <status>401</status>
  <message>Unauthorized: Invalid or missing catalog feed authorization key.</message>
</error>`;

    return new NextResponse(errorXml, {
      status: 401,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const { searchParams } = request.nextUrl;
  const format = (searchParams.get("format") || "").toLowerCase();
  const page = parsePositiveInteger(searchParams.get("page"));
  const perPage = parsePositiveInteger(searchParams.get("per_page"));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.angkon.net";
  const baseUrl = siteUrl.replace(/\/+$/, "");

  try {
    const queryResult = await queryEligibleProducts();
    if (!queryResult.ok) {
      return unavailableResponse(format, queryResult.reason);
    }

    const feedResult = generateMetaCatalogFeed(queryResult.products, {
      baseUrl,
      feedUrl: `${baseUrl}/api/meta/catalog-feed`,
      page,
      perPage,
      allowLocalHttp: process.env.NODE_ENV !== "production",
    });

    if (format === "json") {
      return NextResponse.json(
        {
          feed: "ANGKON Meta Catalog Feed Diagnostic",
          counts: {
            total: feedResult.totalInput,
            valid: feedResult.validCount,
            invalid: feedResult.invalidCount,
            excluded: feedResult.excludedCount,
          },
          pagination: feedResult.pagination,
          items: feedResult.items,
          audit: feedResult.validationResults,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=300",
            "X-Robots-Tag": "noindex, nofollow",
          },
        }
      );
    }

    const headers = new Headers({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Catalog-Total-Items": String(feedResult.totalInput),
      "X-Catalog-Valid-Items": String(feedResult.validCount),
      "X-Catalog-Invalid-Items": String(feedResult.invalidCount),
      "X-Catalog-Excluded-Items": String(feedResult.excludedCount),
      "X-Catalog-Page": String(feedResult.pagination.page),
      "X-Catalog-Total-Pages": String(feedResult.pagination.totalPages),
    });

    return new NextResponse(feedResult.xml, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("GET /api/meta/catalog-feed error:", error);

    return unavailableResponse(format, "internal-error");
  }
}
