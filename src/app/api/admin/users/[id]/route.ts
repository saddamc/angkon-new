import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { normalizeEmail } from "@/server/auth";
import { clientIp } from "@/server/rate-limit";

// PATCH /api/admin/users/[id] — change role or suspend / reactivate an admin.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only a super administrator can change access." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid administrator id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      role?: string;
      isActive?: boolean;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const nextRole =
      body.role === undefined ? undefined : String(body.role).toLowerCase();
    const nextActive = body.isActive;

    if (nextRole === undefined && nextActive === undefined) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    if (nextRole !== undefined && nextRole !== "admin" && nextRole !== "superadmin") {
      return NextResponse.json({ error: "Role must be admin or superadmin." }, { status: 400 });
    }

    await connectToDatabase();
    const target = await User.findById(id).select("-password");
    if (!target || (target.role !== "admin" && target.role !== "superadmin")) {
      return NextResponse.json({ error: "Administrator not found." }, { status: 404 });
    }

    // An administrator cannot lock themselves out.
    const me = String(auth.user || "").toLowerCase();
    const isSelf =
      normalizeEmail(target.email) === me ||
      String(target.name || "").toLowerCase() === me;
    if (isSelf && (nextRole !== undefined || nextActive === false)) {
      return NextResponse.json(
        { error: "You cannot change your own role or suspend your own account." },
        { status: 400 }
      );
    }

    // Never allow the last active super admin to be demoted or suspended.
    const losingSuper =
      target.role === "superadmin" &&
      target.isActive !== false &&
      ((nextRole !== undefined && nextRole !== "superadmin") || nextActive === false);
    if (losingSuper) {
      const remaining = await User.countDocuments({
        _id: { $ne: target._id },
        role: "superadmin",
        isActive: { $ne: false },
      });
      if (remaining === 0) {
        return NextResponse.json(
          { error: "At least one active super administrator must remain." },
          { status: 400 }
        );
      }
    }

    const before = { role: target.role, isActive: target.isActive !== false };
    if (nextRole !== undefined) target.role = nextRole;
    if (nextActive !== undefined) target.isActive = Boolean(nextActive);
    await target.save();

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "admin.user.update",
        targetType: "admin",
        targetId: target.email,
        before,
        after: { role: target.role, isActive: target.isActive !== false },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: String(target._id),
          name: target.name,
          email: target.email,
          phone: target.phone || "",
          role: target.role,
          isActive: target.isActive !== false,
          emailVerified: Boolean(target.emailVerified),
          createdAt: target.createdAt,
          updatedAt: target.updatedAt,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin user update error:", err);
    return NextResponse.json({ error: "Could not update the administrator." }, { status: 500 });
  }
}
