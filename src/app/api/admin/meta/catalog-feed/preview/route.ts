import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { GET as publicCatalogFeed } from "@/app/api/meta/catalog-feed/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Super-admin catalog feed preview.
 *
 * The public feed requires `META_CATALOG_FEED_KEY`. That key must never reach
 * the browser — not in a link, not in the DOM, not in browser history — so the
 * admin "Preview feed" action calls the public handler in-process with the key
 * read from the environment.
 *
 * Result: an authenticated superadmin always sees the real feed, and everyone
 * else still gets the 401 the endpoint is supposed to return.
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdminSession(request);
  if (!auth.authorized) {
    return (
      auth.response ||
      NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    );
  }

  const feedKey = process.env.META_CATALOG_FEED_KEY?.trim();
  if (!feedKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "META_CATALOG_FEED_KEY is not set in this environment, so the public feed cannot authorize requests.",
      },
      { status: 409 }
    );
  }

  const target = new URL("/api/meta/catalog-feed", request.nextUrl.origin);
  target.searchParams.set("feed_key", feedKey);

  // Preserve the caller's diagnostic format (xml by default, json on request).
  const format = request.nextUrl.searchParams.get("format");
  if (format) target.searchParams.set("format", format);

  let response: Response;
  try {
    response = await publicCatalogFeed(new NextRequest(target));
  } catch (error) {
    console.error("[Catalog Feed Preview] in-process call failed:", error);
    return NextResponse.json(
      { ok: false, error: "The catalog feed could not be generated." },
      { status: 500 }
    );
  }

  // Admin previews must never be cached by a shared cache or indexed.
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");

  return new NextResponse(await response.text(), {
    status: response.status,
    headers,
  });
}
