import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { migrateAllMetaTokensAtRest } from "@/server/migrations/migrate-tokens-at-rest";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await migrateAllMetaTokensAtRest(auth.tenantId);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("POST /api/admin/meta/security/migrate-tokens error:", error);
    return NextResponse.json(
      { error: "Token encryption migration failed" },
      { status: 500 }
    );
  }
}
