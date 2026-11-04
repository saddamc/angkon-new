import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * AUTH-001 — "Admin route accessible to a guest: /admin".
 *
 * `/admin` used to *be* the login screen, so it answered 200 to anyone. The
 * login screen now lives at `/admin/login` and `/admin` is a redirect stub that
 * the proxy guards, so an unauthenticated request can never receive an admin
 * page.
 *
 * AUTH-002 — "/api/shipping/settings returned 200 to a guest".
 *
 * That endpoint looked like an admin settings route but served public delivery
 * rates. The public rates now live at `/api/shipping/rates`; the old path is
 * redirected, so it no longer answers 200 with data.
 */

const read = (file) => fs.readFileSync(file, "utf8");

/** The login screen may live under a route group or directly under /admin. */
function loginPagePath() {
  const candidates = [
    "src/app/(auth)/admin/login/page.tsx",
    "src/app/admin/login/page.tsx",
  ].filter((file) => fs.existsSync(file));

  assert.equal(
    candidates.length,
    1,
    `exactly one login page must exist at /admin/login (found ${candidates.length})`
  );
  return candidates[0];
}

test("proxy guards the bare /admin entry point", () => {
  const proxy = read("src/proxy.ts");

  // `:path+` skips `/admin` itself; `:path*` includes it.
  assert.ok(
    proxy.includes('"/admin/:path*"'),
    "the matcher must include /admin itself, not only /admin/<sub>"
  );
});

test("proxy exempts only the login screen, not the whole admin namespace", () => {
  const proxy = read("src/proxy.ts");

  assert.ok(
    proxy.includes('pathname !== "/admin/login"'),
    "/admin/login must be the public exception"
  );
  assert.ok(
    !proxy.includes('pathname !== "/admin";'),
    "/admin must no longer be treated as the public login page"
  );
});

test("unauthenticated admin requests are sent to /admin/login", () => {
  const proxy = read("src/proxy.ts");

  assert.ok(proxy.includes('loginUrl.pathname = "/admin/login"'));
  assert.ok(!proxy.includes('loginUrl.pathname = "/admin";'));
});

test("/admin is a redirect stub, not a screen", () => {
  const page = read("src/app/admin/page.tsx");

  assert.ok(page.includes('redirect("/admin/dashboard")'));
  assert.ok(!page.includes('"use client"'), "the entry point must redirect on the server");
  assert.ok(!page.includes("Sign In"), "the login form must not live here any more");
});

test("the login screen is interactive and posts to the login endpoint", () => {
  const source = read(loginPagePath());

  assert.ok(source.includes('"use client"'), "the login form is interactive");
  assert.ok(source.includes('fetch("/api/admin/login"'), "it posts to the login endpoint");
  assert.ok(source.includes('router.replace("/admin/dashboard")'));
});

test("logging out returns the operator to the login screen", () => {
  const hook = read("src/hooks/use-auth.ts");

  assert.ok(hook.includes('window.location.href = "/admin/login"'));
  assert.ok(!hook.includes('window.location.href = "/admin";'));
});

test("AUTH-002: /api/shipping/settings never serves data to a guest", () => {
  const config = read("next.config.ts");
  const proxy = read("src/proxy.ts");
  const routePath = "src/app/api/shipping/settings/route.ts";

  const isRedirected = config.includes('source: "/api/shipping/settings"');
  const isGuarded =
    proxy.includes('pathname === "/api/shipping/settings"') &&
    proxy.includes('"/api/shipping/settings"');
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
