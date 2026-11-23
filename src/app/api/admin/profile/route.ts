import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore, createAdminToken } from "@/server/admin-auth";
import { EMAIL_REGEX, normalizeEmail } from "@/server/auth";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";

const PHONE_REGEX = /^[0-9+\-\s()]{6,20}$/;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

interface ProfileShape {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  emailVerified: boolean;
  createdAt?: Date | string | null;
}

async function findAdminUser(identifier?: string) {
  const raw = String(identifier || "").trim();
  if (!raw) return null;
  return User.findOne({
    $or: [{ email: raw.toLowerCase() }, { name: raw }],
    role: { $in: ["admin", "superadmin"] },
  });
}

function toProfile(user: {
  _id: unknown;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  emailVerified?: boolean;
  createdAt?: Date | string | null;
}): ProfileShape {
  return {
    id: String(user._id),
    name: String(user.name || ""),
    email: String(user.email || ""),
    phone: String(user.phone || ""),
    role: String(user.role || "admin"),
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt ?? null,
  };
}

// GET /api/admin/profile — the signed-in administrator's own profile.
export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await findAdminUser(auth.user);
    if (!user) {
      return NextResponse.json(
        { error: "Administrator account not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { profile: toProfile(user) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin profile fetch error:", err);
    return NextResponse.json({ error: "Profile is temporarily unavailable." }, { status: 503 });
  }
}

// PATCH /api/admin/profile — update name, email and phone.
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request);
  const limit = await rateLimit(`admin-profile-update:ip:${hashIp(ip)}`, 20, 60 * 60, {
    failClosed: true,
  });
  if (!limit.allowed) {
    return createRateLimitResponse(
      limit,
      "Too many profile changes from this network. Please wait before trying again."
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      email?: string;
      phone?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    await connectToDatabase();
    const user = await findAdminUser(auth.user);
    if (!user) {
      return NextResponse.json({ error: "Administrator account not found." }, { status: 404 });
    }

    const name = String(body.name ?? user.name ?? "").trim();
    const email = normalizeEmail(String(body.email ?? user.email ?? ""));
    const phone = String(body.phone ?? user.phone ?? "").trim();

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
      return NextResponse.json(
        { error: "Enter a valid phone number (6–20 digits, +, -, spaces allowed)." },
        { status: 400 }
      );
    }

    const emailChanged = email !== normalizeEmail(user.email);
    if (emailChanged) {
      const existing = await User.findOne({ email, _id: { $ne: user._id } })
        .select("_id")
        .lean();
      if (existing) {
        return NextResponse.json(
          { error: "That email address is already used by another account." },
          { status: 409 }
        );
      }
    }

    const before = {
      name: user.name,
      email: user.email,
      phone: user.phone,
    };

    user.name = name;
    user.email = email;
    user.phone = phone;
    if (emailChanged) {
      // The admin changed their own login identity — keep it verified.
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
    }
    await user.save();

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "admin.profile.update",
        targetType: "admin",
        targetId: email,
        before,
        after: { name, email, phone },
        ip,
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    // Re-issue the session so the sidebar immediately reflects the new name and
    // the login identifier (`sub`) stays valid after an email change.
    const response = NextResponse.json(
      { ok: true, profile: toProfile(user) },
      { headers: { "Cache-Control": "no-store" } }
    );
    const token = createAdminToken({
      sub: email,
      name,
      role: user.role,
      authorizedTenants: auth.authorizedTenants,
      defaultTenant: auth.tenantId,
      ttlSeconds: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.set("nb_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Admin profile update error:", err);
    return NextResponse.json({ error: "Profile update failed. Please retry." }, { status: 500 });
  }
}
