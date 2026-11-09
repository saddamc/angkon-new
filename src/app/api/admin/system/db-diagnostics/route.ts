import { NextResponse } from "next/server";
import { connectToDatabase, getDatabaseDiagnostics } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
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
    const diagnostics = getDatabaseDiagnostics();
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Database connection failure",
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
