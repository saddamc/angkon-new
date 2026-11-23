import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { hashPassword } from "@/server/auth";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";

// POST /api/admin/users/[id]/password — reset another administrator's password.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only a super administrator can reset another administrator's password." },
      { status: 403 }
    );
  }

  const ip = clientIp(request);
  const limit = await rateLimit(`admin-user-password:ip:${hashIp(ip)}`, 10, 15 * 60, {
    failClosed: true,
  });
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many password resets. Please wait a few minutes.");
  }

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid administrator id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as { newPassword?: string } | null;
    const newPassword = String(body?.newPassword || "");
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json(
        { error: "New password must be between 8 and 128 characters." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const target = await User.findById(id).select("+password");
    if (!target || (target.role !== "admin" && target.role !== "superadmin")) {
      return NextResponse.json({ error: "Administrator not found." }, { status: 404 });
    }

    target.password = hashPassword(newPassword);
    await target.save();

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "admin.user.password",
        targetType: "admin",
        targetId: target.email,
        before: null,
        after: { resetAt: new Date().toISOString() },
        ip,
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Admin password reset error:", err);
    return NextResponse.json({ error: "Could not reset the password." }, { status: 500 });
  }
}
