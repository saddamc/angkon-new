import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/server/admin-auth";
import {
  getCatalogFeedDiagnostics,
  getMetaCatalogSettings,
  getPublicMetaCatalogSettings,
  probeProductionFeed,
} from "@/server/meta-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const probeRequested = ["1", "true", "yes"].includes(
      (request.nextUrl.searchParams.get("probe") || "").toLowerCase()
    );

    const [diagnostics, catalogSettings] = await Promise.all([
      getCatalogFeedDiagnostics({
        requestOrigin: request.nextUrl.origin,
      }),
      getMetaCatalogSettings(auth.tenantId),
    ]);

    const production = probeRequested
      ? await probeProductionFeed(diagnostics.productionFeedUrl)
      : null;

    return NextResponse.json(
      {
        diagnostics,
        catalog: getPublicMetaCatalogSettings(catalogSettings),
        production,
        metaStatus: {
          catalogConnection: {
            state: getPublicMetaCatalogSettings(catalogSettings).connectionState,
            label: getPublicMetaCatalogSettings(catalogSettings).connectionLabel,
            detail: getPublicMetaCatalogSettings(catalogSettings).connectionDetail,
          },
          lastSuccessfulMetaFetch: {
            available: false,
            value: null,
            detail:
              "Meta does not expose a catalog import timestamp to ANGKON without an authorized Catalog API connection. This feed being served does not mean Meta has imported it.",
          },
          productImportErrors: {
            localValidationAvailable: true,
            metaImportErrorsAvailable: false,
            detail:
              "Local feed validation errors are shown below. Meta-side product import errors are only visible in Commerce Manager or through an authorized Catalog API connection.",
          },
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("GET /api/admin/meta/catalog/diagnostics error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate catalog diagnostics",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
