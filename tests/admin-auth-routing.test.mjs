import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * AUTH-001 — "Admin route accessible to a guest".
 *
 * The audit walks every path under /admin and expects 401/403/307 for a guest.
 * A login form at /admin/login can only ever answer 200, so it will always be
 * reported. The login screen therefore lives at /login — outside the /admin
 * namespace — and /admin plus every /admin/* page is guarded by the proxy.
 *
 * AUTH-002 — "/api/shipping/settings returned 200 to a guest".
 *
 * Public delivery rates live at /api/shipping/rates; the old settings path is
 * redirected (or admin-guarded), so it never serves data to a guest.
 */

const read = (file) => fs.readFileSync(file, "utf8");

test("proxy guards every /admin path, with no public exception", () => {
  const proxy = read("src/proxy.ts");

  assert.ok(
    proxy.includes("const isAdminPage = pathname.startsWith(\"/admin\");"),
    "no /admin sub-path may be exempt from the guard"
  );
  assert.ok(
    !proxy.includes('pathname !== "/admin/login"'),
    "the login exemption must be gone — login is not under /admin any more"
  );
  assert.ok(proxy.includes('"/admin/:path*"'), "the matcher must cover /admin sub-paths");
  assert.ok(proxy.includes('"/admin"'), "the matcher must include the bare /admin entry point");
});

test("unauthenticated admin requests are sent to /login", () => {
  const proxy = read("src/proxy.ts");

  assert.ok(proxy.includes('loginUrl.pathname = "/login"'));
  assert.ok(!proxy.includes('loginUrl.pathname = "/admin/login"'));
});

test("/admin is a redirect stub, not a screen", () => {
  const page = read("src/app/admin/page.tsx");

  assert.ok(page.includes("redirect("));
  assert.ok(!page.includes('"use client"'), "the entry point must redirect on the server");
  assert.ok(!page.includes("Sign In"), "the login form must not live under /admin");
});

test("the login screen lives outside the /admin namespace", () => {
  assert.ok(fs.existsSync("src/app/login/page.tsx"), "login page must exist at /login");
  assert.ok(
    !fs.existsSync("src/app/admin/login/page.tsx"),
    "no login page may exist under /admin — that is what the audit flags"
  );

  const source = read("src/app/login/page.tsx");
  assert.ok(source.includes('"use client"'), "the login form is interactive");
  assert.ok(source.includes('fetch("/api/admin/login"'), "it posts to the login endpoint");
  assert.ok(source.includes('router.replace("/admin/dashboard")'));
});

test("the login screen renders without storefront chrome", () => {
  const shell = read("src/components/layout/root-shell.tsx");

  assert.ok(
    shell.includes('pathname === "/login"'),
    "RootShell must render /login bare, like the admin routes"
  );
});

test("logging out returns the operator to the login screen", () => {
  const hook = read("src/hooks/use-auth.ts");

  assert.ok(hook.includes('window.location.href = "/login"'));
  assert.ok(!hook.includes('window.location.href = "/admin/login"'));
});

test("the old /admin/login path redirects instead of rendering", () => {
  const config = read("next.config.ts");

  assert.ok(
    config.includes('source: "/admin/login", destination: "/login"'),
    "old bookmarks must redirect, not 404"
  );
});

test("AUTH-002: /api/shipping/settings never serves data to a guest", () => {
  const config = read("next.config.ts");
  const proxy = read("src/proxy.ts");
  const routePath = "src/app/api/shipping/settings/route.ts";

  const isRedirected = config.includes('source: "/api/shipping/settings"');
  const isGuarded = proxy.includes('"/api/shipping/settings"');
  const isAdminOnly =
    fs.existsSync(routePath) && read(routePath).includes("requireAdminSession");

  assert.ok(
    isRedirected || isGuarded || isAdminOnly,
    "the old public settings path must be redirected, proxy-guarded, or admin-only"
  );
});

test("public delivery rates are served by a clearly public, read-only endpoint", () => {
  const rates = "src/app/api/shipping/rates/route.ts";

  assert.ok(fs.existsSync(rates), "public rates belong at /api/shipping/rates");

  const source = read(rates);
  assert.ok(source.includes("export async function GET"));
  assert.ok(!source.includes("export async function POST"), "public rates are read-only");
  assert.ok(!source.includes("requireAdminSession"), "rates are intentionally public");
});

test("the login route is excluded from search engines", () => {
  const robots = read("src/app/robots.ts");
  assert.ok(robots.includes('"/login"'), "robots.txt must disallow /login");
});
