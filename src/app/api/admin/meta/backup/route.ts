import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  exportDatabase,
  getDatabaseStats,
  restoreDatabase,
  validateBackupPayload,
} from "@/server/database-backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Whole-database backup / restore. Super-admin only.
 *
 *   GET  /api/admin/meta/backup            → download a JSON backup
 *   GET  /api/admin/meta/backup?stats=1    → per-collection counts
 *   POST /api/admin/meta/backup            → merge-restore an uploaded backup
 *   POST /api/admin/meta/backup?includeUsers=1 → also restore the users collection
 *
 * The Meta layout and `src/proxy.ts` already gate `/admin/meta/*` to super
 * admins; this handler re-checks so the API is safe on its own.
 */

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

async function authorize(request: NextRequest) {
  const auth = await requireSuperAdminSession(request);
  if (!auth.authorized) {
    return {
      ok: false as const,
      response:
        auth.response ||
        NextResponse.json(
          { ok: false, error: "Super administrator privileges are required." },
          { status: 403, headers: NO_STORE }
        ),
    };
  }
  return { ok: true as const, auth };
}

export async function GET(request: NextRequest) {
  const gate = await authorize(request);
  if (!gate.ok) return gate.response;

  try {
    if (request.nextUrl.searchParams.get("stats") === "1") {
      const stats = await getDatabaseStats();
      return NextResponse.json({ ok: true, stats }, { headers: NO_STORE });
    }

    const file = await exportDatabase();
    const stamp = file.generatedAt.replace(/[:.]/g, "-");

    return new NextResponse(JSON.stringify(file), {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="angkon-backup-${stamp}.json"`,
      },
    });
  } catch (error) {
    console.error("[Backup] export failed:", error);
    return NextResponse.json(
      { ok: false, error: "The backup could not be generated." },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await authorize(request);
  if (!gate.ok) return gate.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "The uploaded file is not valid JSON." },
      { status: 400, headers: NO_STORE }
    );
  }

  const parsed = validateBackupPayload(payload);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400, headers: NO_STORE });
  }

  const includeUsers = request.nextUrl.searchParams.get("includeUsers") === "1";

  try {
    const report = await restoreDatabase(parsed.file, { includeUsers });
    return NextResponse.json(
      {
        ok: true,
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        includeUsers,
        report,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[Backup] restore failed:", error);
    return NextResponse.json(
      { ok: false, error: "The restore failed before completing. No documents were dropped." },
      { status: 500, headers: NO_STORE }
    );
  }
}
