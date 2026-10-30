import { NextRequest, NextResponse } from "next/server";
import { generateCatalogFeed } from "@/server/meta-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function feedHeaders(feed: Awaited<ReturnType<typeof generateCatalogFeed>>): Headers {
  const headers = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex",
    "X-Feed-Generated-At": feed.generatedAt,
    "X-Feed-Valid-Items": String(feed.build.counts.validItems),
    "X-Feed-Invalid-Items": String(feed.build.counts.invalidItems),
    "X-Feed-Excluded-Items": String(feed.build.counts.excludedItems),
    "X-Feed-Duplicate-Items": String(feed.build.counts.duplicateItems),
    "X-Feed-Page": String(feed.page.page),
    "X-Feed-Per-Page": String(feed.page.perPage),
    "X-Feed-Total-Pages": String(feed.page.totalPages),
    "X-Feed-Total-Visible": String(feed.page.totalVisible),
    "X-Feed-Truncated": String(feed.page.truncated),
    "X-Feed-Public-Https": String(feed.feedIsPublicHttps),
  });

  if (feed.page.totalPages > 1) {
    const base = new URL(feed.feedUrl);
    const last = new URL(base.toString());
    last.searchParams.set("page", String(feed.page.totalPages));
    headers.set("Link", `<${last.toString()}>; rel="last"`);

    if (feed.page.page < feed.page.totalPages) {
      const next = new URL(base.toString());
      next.searchParams.set("page", String(feed.page.page + 1));
      const first = new URL(base.toString());
      first.searchParams.set("page", "1");
      headers.append("Link", `<${next.toString()}>; rel="next"`);
      headers.append("Link", `<${first.toString()}>; rel="first"`);
    }
  }

  return headers;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = (searchParams.get("format") || "").toLowerCase();
  const page = parsePositiveInteger(searchParams.get("page"));
  const perPage = parsePositiveInteger(searchParams.get("per_page"));

  try {
    const feed = await generateCatalogFeed({
      requestOrigin: request.nextUrl.origin,
      page,
      perPage,
    });

    if (format === "json") {
      return NextResponse.json(
        {
          catalog: "Maison ANGKON Meta Product Feed",
          generatedAt: feed.generatedAt,
          feedUrl: feed.feedUrl,
          total: feed.build.counts.validItems,
          counts: feed.build.counts,
          categoryCoverage: feed.build.categoryCoverage,
          page: {
            page: feed.page.page,
            perPage: feed.page.perPage,
            totalPages: feed.page.totalPages,
            totalVisible: feed.page.totalVisible,
            truncated: feed.page.truncated,
          },
          allLinksPublicHttps: feed.build.allLinksPublicHttps,
          warnings: feed.warnings,
          items: feed.build.items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            sale_price: item.salePrice,
            availability: item.availability,
            condition: item.condition,
            link: item.link,
            image_link: item.imageLink,
            additional_image_links: item.additionalImageLinks,
            brand: item.brand,
            google_product_category: item.googleProductCategory,
            product_type: item.productType,
            item_group_id: item.itemGroupId,
            size: item.size,
            gender: item.gender,
            age_group: item.ageGroup,
            color: item.color,
            mpn: item.mpn,
          })),
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
            "Access-Control-Allow-Origin": "*",
            "X-Robots-Tag": "noindex",
          },
        }
      );
    }

    return new NextResponse(feed.xml, {
      status: 200,
      headers: feedHeaders(feed),
    });
  } catch (error) {
    console.error("GET /api/meta/catalog error:", error);

    const message = "Catalog feed is temporarily unavailable. Please retry shortly.";

    if (format === "json") {
      return NextResponse.json(
        { error: message, generatedAt: new Date().toISOString() },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "300",
          },
        }
      );
    }

    // Never return an empty catalog on transient failure: Meta could interpret
    // that as every product being deleted.
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Maison ANGKON Product Catalog</title>
    <description>${message}</description>
    <lastBuildDate>${new Date().toISOString()}</lastBuildDate>
  </channel>
</rss>`;

    return new NextResponse(errorXml, {
      status: 503,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "300",
        "X-Robots-Tag": "noindex",
      },
    });
  }
}
