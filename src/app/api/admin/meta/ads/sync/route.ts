import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaAdImportJob } from "@/models/MetaAdImportJob";
import {
  createAndRunAdImportJob,
  resumeAdImportJob,
} from "@/server/meta-marketing-api";
import { MetaAdReportingLevel } from "@/models/MetaAdReport";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const jobs = await MetaAdImportJob.find({ tenantId: auth.tenantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      jobs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error listing sync jobs";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, jobId, since, until, level } = body;

    if (action === "resume" && jobId) {
      const job = await resumeAdImportJob(jobId);
      return NextResponse.json({
        ok: true,
        tenantId: auth.tenantId,
        message: `Job ${jobId} status is now ${job.status}.`,
        job,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const sinceDate = since || thirtyDaysAgo;
    const untilDate = until || today;
    const targetLevel: MetaAdReportingLevel = level || "campaign";

    const job = await createAndRunAdImportJob({
      since: sinceDate,
      until: untilDate,
      level: targetLevel,
      tenantId: auth.tenantId,
    });

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      message: `Sync job ${job.jobId} completed with status: ${job.status}.`,
      job,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error running sync job";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
