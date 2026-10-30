import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/server/admin-auth";
import {
  getMetaCatalogSettings,
  getPublicMetaCatalogSettings,
  recordCatalogVerification,
  verifyCatalogApiAccess,
} from "@/server/meta-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
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

    const verification = await verifyCatalogApiAccess(
      settings.catalogId,
      settings.catalogApiToken
    );

    const saved = await recordCatalogVerification(auth.tenantId, {
      ok: verification.ok,
      catalogName: verification.catalogName,
      productCount: verification.productCount,
      error: verification.error,
    });

    return NextResponse.json(
      {
        ok: verification.ok,
        verification,
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
