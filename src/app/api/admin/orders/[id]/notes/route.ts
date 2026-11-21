import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { Order } from "@/models/Order";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { clientIp } from "@/server/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";

    if (!text) {
      return NextResponse.json({ error: "Note text is required." }, { status: 400 });
    }

    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ orderNumber: id }, { _id: id }] }
      : { orderNumber: id };

    const noteEntry = {
      id: crypto.randomUUID(),
      text,
      actor: auth.user || "admin",
      at: new Date(),
    };

    const updated = await Order.findOneAndUpdate(
      query,
      { $push: { adminNotes: noteEntry } },
      { returnDocument: "after" }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "order.admin_note.add",
        targetType: "order",
        targetId: updated.orderNumber,
        before: null,
        after: { noteId: noteEntry.id, text },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json({
      ok: true,
      note: noteEntry,
      adminNotes: updated.adminNotes || [],
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/notes error:", error);
    return NextResponse.json({ error: "Could not save admin note." }, { status: 500 });
  }
}
