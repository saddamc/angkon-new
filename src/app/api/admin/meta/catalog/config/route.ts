import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { getOrInitCatalogConfig } from "@/server/meta-catalog-connection";
import type { IMetaFeedSchedule } from "@/models/MetaCatalogConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getOrInitCatalogConfig(auth.tenantId);
    return NextResponse.json(
      { config: config.toSafeJSON() },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("GET /api/admin/meta/catalog/config error:", error);
    return NextResponse.json({ error: "Failed to load catalog configuration" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      businessId?: string;
      catalogId?: string;
      accessToken?: string;
      feedName?: string;
      feedSchedule?: Partial<IMetaFeedSchedule>;
    };

    const config = await getOrInitCatalogConfig(auth.tenantId);

    if (body.catalogId !== undefined) {
      const clean = body.catalogId.trim().replace(/^catalog_/i, "");
      if (clean && !/^\d{5,25}$/.test(clean)) {
        return NextResponse.json(
          {
            error:
              "Invalid Meta Catalog ID. Use the numeric catalog ID shown in Commerce Manager (5 to 25 digits).",
          },
          { status: 400 }
        );
      }
      config.catalogId = clean;
    }

    if (body.businessId !== undefined) {
      config.businessId = body.businessId.trim();
    }

    if (body.feedName !== undefined && body.feedName.trim()) {
      config.feedName = body.feedName.trim();
    }

    if (body.feedSchedule) {
      if (body.feedSchedule.interval) config.feedSchedule.interval = body.feedSchedule.interval;
      if (typeof body.feedSchedule.hour === "number") config.feedSchedule.hour = body.feedSchedule.hour;
      if (typeof body.feedSchedule.minute === "number") config.feedSchedule.minute = body.feedSchedule.minute;
    }

    if (body.accessToken !== undefined) {
      const raw = body.accessToken.trim();
      // Only update if not masked placeholder
      if (raw && !raw.includes("••••") && !raw.includes("***")) {
        config.setAccessToken(raw);
        // Reset connection status until verified
        config.connectionStatus = "DISCONNECTED";
      } else if (!raw) {
        config.setAccessToken("");
        config.connectionStatus = "DISCONNECTED";
      }
    }

    await config.save();

    return NextResponse.json(
      { config: config.toSafeJSON() },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("POST /api/admin/meta/catalog/config error:", error);
    return NextResponse.json({ error: "Failed to save catalog configuration" }, { status: 500 });
  }
}
