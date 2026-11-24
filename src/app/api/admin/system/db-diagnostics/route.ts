import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getDatabaseDiagnostics } from "@/lib/mongodb";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) return auth.response;

  try {
    await connectToDatabase();
    const diagnostics = getDatabaseDiagnostics();

    return NextResponse.json(
      {
        success: true,
        data: diagnostics,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Admin database diagnostics error:", error);
    const diagnostics = getDatabaseDiagnostics();
    return NextResponse.json(
      {
        success: false,
        error: "Database diagnostics unavailable",
        data: diagnostics,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
