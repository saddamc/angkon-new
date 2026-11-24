import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { hashPassword, verifyPassword } from "@/server/auth/auth";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";

// POST /api/admin/profile/password — change the signed-in administrator's password.
export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request);
  const limit = await rateLimit(`admin-profile-password:ip:${hashIp(ip)}`, 5, 15 * 60, {
    failClosed: true,
  });
  if (!limit.allowed) {
    return createRateLimitResponse(
      limit,
      "Too many password change attempts. Please wait a few minutes before trying again."
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      currentPassword?: string;
      newPassword?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json(
        { error: "New password must be between 8 and 128 characters." },
        { status: 400 }
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "The new password must be different from the current password." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const identifier = String(auth.user || "").trim();
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { name: identifier }],
      role: { $in: ["admin", "superadmin"] },
    }).select("+password");

    if (!user) {
      return NextResponse.json({ error: "Administrator account not found." }, { status: 404 });
    }
    if (!user.password || !verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    user.password = hashPassword(newPassword);
    await user.save();

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "admin.profile.password",
        targetType: "admin",
        targetId: user.email,
        before: null,
        after: { changedAt: new Date().toISOString() },
        ip,
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin password update error:", err);
    return NextResponse.json({ error: "Password update failed. Please retry." }, { status: 500 });
  }
}
