import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { verifyAndConnectCatalog } from "@/server/meta-catalog-connection";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      catalogId?: string;
      businessId?: string;
      accessToken?: string;
    };

    const result = await verifyAndConnectCatalog({
      tenantId: auth.tenantId,
      catalogId: body.catalogId,
      businessId: body.businessId,
      accessToken: body.accessToken,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("POST /api/admin/meta/catalog/verify-connection error:", error);
    return NextResponse.json(
      { error: "Failed to verify Meta Catalog connection" },
      { status: 500 }
    );
  }
}
