import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import {
  getMetaCatalogSettings,
  getPublicMetaCatalogSettings,
  normalizeMetaCatalogId,
  saveMetaCatalogSettings,
  type MetaCatalogSettings,
} from "@/server/meta-catalog";
import { buildFeedUrl, resolveProductionBaseUrl, resolvePublicBaseUrl } from "@/lib/meta-catalog";

export const dynamic = "force-dynamic";

function buildFeedInfo(request: NextRequest) {
  const env = process.env;
  const nodeEnv = env.NODE_ENV || "development";
  const current = resolvePublicBaseUrl({
    env,
    requestOrigin: request.nextUrl.origin,
    nodeEnv,
  });
  const production = resolveProductionBaseUrl(env);

  return {
    environment: nodeEnv,
    currentUrl: buildFeedUrl(current.baseUrl),
    currentBaseUrl: current.baseUrl,
    currentSource: current.source,
    currentIsPublicHttps: current.isPublicHttps,
    productionUrl: buildFeedUrl(production.baseUrl),
    productionBaseUrl: production.baseUrl,
    productionSource: production.source,
    productionIsPublicHttps: production.isPublicHttps,
    warnings: Array.from(new Set([...current.warnings, ...production.warnings])),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getMetaCatalogSettings(auth.tenantId);

    return NextResponse.json(
      {
        settings: getPublicMetaCatalogSettings(settings),
        feed: buildFeedInfo(request),
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("GET /api/admin/meta/catalog/settings error:", error);
    return NextResponse.json({ error: "Failed to load catalog settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<MetaCatalogSettings>;

    if (body.catalogId !== undefined) {
      const catalogId = normalizeMetaCatalogId(body.catalogId);
      if (catalogId && !/^\d{5,25}$/.test(catalogId)) {
        return NextResponse.json(
          {
            error:
              "Invalid Meta Catalog ID. Use the numeric catalog ID shown in Commerce Manager (5 to 25 digits).",
          },
          { status: 400 }
        );
      }
    }

    if (body.businessId !== undefined) {
      const businessId = String(body.businessId).trim();
      if (businessId && !/^\d{5,25}$/.test(businessId)) {
        return NextResponse.json(
          { error: "Invalid Meta Business ID. Business IDs are numeric (5 to 25 digits)." },
          { status: 400 }
        );
      }
    }

    if (typeof body.catalogApiToken === "string") {
      const token = body.catalogApiToken.trim();
      const isMaskedPlaceholder = token.includes("••••") || token.includes("***");
      if (token && !isMaskedPlaceholder && token.length < 10) {
        return NextResponse.json(
          { error: "Catalog API access token is too short to be a valid Meta credential." },
          { status: 400 }
        );
      }
    }

    // Only these three fields are client-settable. Verification metadata
    // (lastVerifiedAt, catalogName, product count) must come from a real
    // Graph API check, never from a request body.
    const updates: Partial<MetaCatalogSettings> = {};
    if (body.catalogId !== undefined) updates.catalogId = body.catalogId;
    if (body.businessId !== undefined) updates.businessId = body.businessId;
    if (body.catalogApiToken !== undefined) {
      updates.catalogApiToken = body.catalogApiToken;
    }

    const saved = await saveMetaCatalogSettings(updates, auth.tenantId);

    return NextResponse.json({
      success: true,
      settings: getPublicMetaCatalogSettings(saved),
      feed: buildFeedInfo(request),
    });
  } catch (error) {
    console.error("POST /api/admin/meta/catalog/settings error:", error);
    return NextResponse.json({ error: "Failed to save catalog settings" }, { status: 500 });
  }
}
