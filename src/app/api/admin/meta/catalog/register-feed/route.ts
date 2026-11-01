import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { registerOrUpdateProductFeed, disconnectProductFeed } from "@/server/meta-product-feeds";
import type { IMetaFeedSchedule } from "@/models/MetaCatalogConfig";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      feedName?: string;
      feedSchedule?: Partial<IMetaFeedSchedule>;
      feedUrl?: string;
    };

    const result = await registerOrUpdateProductFeed({
      tenantId: auth.tenantId,
      feedName: body.feedName,
      feedSchedule: body.feedSchedule,
      feedUrl: body.feedUrl,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("POST /api/admin/meta/catalog/register-feed error:", error);
    return NextResponse.json(
      { error: "Failed to register scheduled product feed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const deleteOnMeta = searchParams.get("delete_on_meta") === "true";

    const result = await disconnectProductFeed({
      tenantId: auth.tenantId,
      deleteOnMeta,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("DELETE /api/admin/meta/catalog/register-feed error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect product feed" },
      { status: 500 }
    );
  }
}
