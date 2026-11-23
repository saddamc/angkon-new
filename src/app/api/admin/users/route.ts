import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { EMAIL_REGEX, hashPassword, normalizeEmail } from "@/server/auth";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";

const PHONE_REGEX = /^[0-9+\-\s()]{6,20}$/;

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

function toRow(user: {
  _id: unknown;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}): AdminUserRow {
  return {
    id: String(user._id),
    name: String(user.name || ""),
    email: String(user.email || ""),
    phone: String(user.phone || ""),
    role: String(user.role || "admin"),
    isActive: user.isActive !== false,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  };
}

// GET /api/admin/users — list administrators (readable by any admin).
export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only a super administrator can view user access." },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const users = await User.find({ role: { $in: ["admin", "superadmin"] } })
      .select("-password")
      .sort({ role: -1, createdAt: 1 })
      .lean();

    return NextResponse.json(
      {
        me: { role: auth.role || "admin", identifier: auth.user || "" },
        users: users.map(toRow),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json({ error: "Could not load administrators." }, { status: 503 });
  }
}

// POST /api/admin/users — create an administrator (super admin only).
export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only a super administrator can create administrator accounts." },
      { status: 403 }
    );
  }

  const ip = clientIp(request);
  const limit = await rateLimit(`admin-user-create:ip:${hashIp(ip)}`, 20, 60 * 60, {
    failClosed: true,
  });
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many administrator accounts created. Please wait.");
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    const email = normalizeEmail(String(body.email || ""));
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const role = String(body.role || "admin").toLowerCase();

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "Name must be between 2 and 80 characters." },
        { status: 400 }
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 8 and 128 characters." },
        { status: 400 }
      );
    }
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ error: "Role must be admin or superadmin." }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const created = await User.create({
      name,
      email,
      phone,
      password: hashPassword(password),
      role,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      source: "admin",
    });

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "admin.user.create",
        targetType: "admin",
        targetId: email,
        before: null,
        after: { name, email, role },
        ip,
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json(
      { ok: true, user: toRow(created) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin user create error:", err);
    return NextResponse.json(
      { error: "Could not create the administrator account." },
      { status: 500 }
    );
  }
}
