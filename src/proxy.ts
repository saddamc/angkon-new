import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest, needsCsrfProtection } from "./server/security/csrf";
import { securityLog } from "./server/security/security-log";

const JWT_SECRET = process.env.JWT_SECRET?.trim() || "";

// ── Verify HMAC-SHA256 token ──────────────────────────────────────────────────
async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    if (!JWT_SECRET) return null;
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

  // Guard every /admin page (including /admin itself, which is a redirect
  // stub) and every /api/admin route. The login screen lives at /login, which
  // is outside this namespace, so no /admin path is ever public.
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi =
    (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login") ||
    pathname === "/api/shipping/settings";

  // CSRF / cross-origin guard for browser-originated mutations. It runs before
  // auth so a forged request never reaches a handler.
  if (needsCsrfProtection(pathname, request.method) && !isSameOriginRequest(request)) {
    securityLog("csrf.origin_mismatch", {
      path: pathname,
      method: request.method,
    });
    return NextResponse.json(
      { error: "Cross-origin request rejected.", code: "CSRF_ORIGIN_MISMATCH" },
      { status: 403 }
    );
  }

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get("nb_admin_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    // API routes → 401 JSON
    if (isAdminApi) {
      securityLog("admin.unauthorized", { path: pathname, method: request.method });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Admin pages → redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
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
      securityLog("admin.forbidden", { path: pathname, method: request.method });
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
  // Explicitly match `/admin` as well as any subpath, plus all admin APIs and
  // protected settings. Customer/auth/payment mutations are included so the
  // cross-origin guard runs for browser-originated state changes.
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/auth/:path*",
    "/api/orders",
    "/api/promo/validate",
    "/api/payment/sslcommerz/initiate",
    "/api/payments/:path*",
    "/api/pixel/events",
    "/api/shipping/settings",
  ],
};
