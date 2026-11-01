import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import {
  getMetaCatalogSettings,
  getPublicMetaCatalogSettings,
  recordCatalogVerification,
  verifyCatalogApiAccess,
} from "@/server/meta-catalog";
import { verifyAndConnectCatalog } from "@/server/meta-catalog-connection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getMetaCatalogSettings(auth.tenantId, true);

    if (!settings.catalogId || !settings.catalogApiToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Meta Catalog API verification requires both a Catalog ID and a dedicated catalog_management access token. Scheduled feed setup does not need either.",
          settings: getPublicMetaCatalogSettings(settings),
        },
        { status: 400 }
      );
    }

    // Run Stage 2 connection & permission verification
    const stage2Result = await verifyAndConnectCatalog({
      tenantId: auth.tenantId,
      catalogId: settings.catalogId,
      businessId: settings.businessId,
      accessToken: settings.catalogApiToken,
    });

    const verification = await verifyCatalogApiAccess(
      settings.catalogId,
      settings.catalogApiToken
    );

    const saved = await recordCatalogVerification(auth.tenantId, {
      ok: stage2Result.ok && verification.ok,
      catalogName: stage2Result.catalogName || verification.catalogName,
      productCount: stage2Result.productCount !== undefined ? stage2Result.productCount : verification.productCount,
      error: stage2Result.error || verification.error,
    });

    return NextResponse.json(
      {
        ok: stage2Result.ok && verification.ok,
        verification: {
          ...verification,
          error: stage2Result.error || verification.error,
        },
        stage2: stage2Result,
        settings: getPublicMetaCatalogSettings(saved),
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("POST /api/admin/meta/catalog/verify error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to verify Meta Catalog API access" },
      { status: 500 }
    );
  }
}

