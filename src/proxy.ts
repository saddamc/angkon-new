import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";

// ── Verify HMAC-SHA256 token ──────────────────────────────────────────────────
async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Decode base64 signature
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;

    // Check expiry
    const payload = JSON.parse(atob(body));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    if (payload.role !== "admin" && payload.role !== "superadmin") return null;

    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard admin pages and admin API routes (not the login page/endpoint itself)
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin";
  const isAdminApi  = pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get("nb_admin_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    // API routes → 401 JSON
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Admin pages → redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // Superadmin-only guard:
  // Meta Events Manager (/admin/meta*, /admin/pixel*) & Meta CAPI/Catalog APIs are strictly Super Admin only
  const isSuperAdminRoute =
    pathname.startsWith("/admin/meta") ||
    pathname.startsWith("/admin/pixel") ||
    pathname.startsWith("/api/admin/meta") ||
    pathname.startsWith("/api/admin/pixel") ||
    pathname.startsWith("/api/admin/settings/pixel");

  if (isSuperAdminRoute && payload.role !== "superadmin") {
    if (isAdminApi) {
      return NextResponse.json(
        { error: "Forbidden: Super Administrator privileges required." },
        { status: 403 }
      );
    }
    // Blocked from Meta GUI -> redirect to main dashboard
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path+", "/api/admin/:path+"],
};
