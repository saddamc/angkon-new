import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaEventLog } from "@/models/MetaEventLog";
import { sendMetaCapiEvent, MetaCapiEventPayload } from "@/server/meta-capi";
import { requireAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Admin action to manually trigger a retry for a failed or retrying CAPI event.
 * Re-uses the existing log record and its original eventId to guarantee idempotency.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const logId = body?.logId ? String(body.logId).trim() : undefined;
    const eventId = body?.eventId ? String(body.eventId).trim() : undefined;

    if (!logId && !eventId) {
      return NextResponse.json({ error: "Missing logId or eventId" }, { status: 400 });
    }

    await connectToDatabase();

    const query: Record<string, unknown> = {
      tenantId: auth.tenantId,
      source: "server",
    };
    if (logId) query._id = logId;
    if (eventId) query.eventId = eventId;

    const doc = await MetaEventLog.findOne(query);
    if (!doc) {
      return NextResponse.json({ error: "Event log not found" }, { status: 404 });
    }

    if (doc.status === "processing") {
      return NextResponse.json(
        { error: "Event is currently being processed by another worker lease." },
        { status: 409 }
      );
    }

    const payload: MetaCapiEventPayload = {
      eventName: doc.eventName,
      eventId: doc.eventId,
      eventTime: doc.eventTime,
      eventSourceUrl: doc.url,
      actionSource: "website",
      customData: doc.parameters as unknown as MetaCapiEventPayload["customData"],
      testEventCode: doc.testEventCode,
      tenantId: auth.tenantId,
    };

    // Execute delivery attempt using original eventId
    const response = await sendMetaCapiEvent(payload, undefined, undefined, auth.tenantId);

    const updatedDoc = await MetaEventLog.findById(doc._id).lean();

    return NextResponse.json({
      success: response.success,
      status: response.status,
      eventsReceived: response.eventsReceived,
      fbtraceId: response.fbtraceId,
      error: response.error,
      event: updatedDoc,
    });
  } catch (error) {
    console.error("POST /api/admin/meta/capi/retry error:", error);
    return NextResponse.json({ error: "Failed to retry event dispatch" }, { status: 500 });
  }
}
