import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { generateMetaCatalogFeed } from "@/lib/integrations/meta";
import REAL_PRODUCTS from "@/data/real-products.json";

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
    let products: unknown[] = [];

    try {
      await connectToDatabase();
      products = await Product.find({
        status: { $in: ["publish", "published"] },
      })
        .sort({ id: -1 })
        .lean();
    } catch (dbErr) {
      console.warn("MongoDB catalog feed query warning, using local catalog fallback:", dbErr);
      products = REAL_PRODUCTS as unknown[];
    }

    if (!products || products.length === 0) {
      products = REAL_PRODUCTS as unknown[];
    }

    const feedResult = generateMetaCatalogFeed(products, {
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

    const message = "ANGKON catalog feed is temporarily unavailable. Please retry shortly.";
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ANGKON Product Catalog Feed</title>
    <description>${message}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`;

    return new NextResponse(errorXml, {
      status: 503,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "300",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
}
