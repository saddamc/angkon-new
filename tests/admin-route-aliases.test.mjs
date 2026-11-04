import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * `/admin/ads` has no page of its own — the Ads screen lives at
 * `/admin/meta/ads`, so the short path used to 404. `next.config.ts` aliases
 * the short admin paths the same way it already aliases
 * `/admin/meta/pixel` → Events.
 *
 * These tests make sure the aliases exist *and* that none of them shadows a
 * real route (e.g. `/admin/settings` is a genuine page and must not redirect).
 */

const CONFIG = "next.config.ts";

function redirects() {
  const source = fs.readFileSync(CONFIG, "utf8");
  const block = source.slice(source.indexOf("async redirects()"));
  const found = [];
  const re =
    /\{\s*source:\s*"([^"]+)",\s*destination:\s*"([^"]+)",\s*permanent:\s*(true|false)\s*\}/g;
  let match;
  while ((match = re.exec(block)) !== null) {
    found.push({ source: match[1], destination: match[2], permanent: match[3] === "true" });
  }
  return found;
}

/** Every real page route under src/app, as Next.js would serve it. */
function realRoutes() {
  const root = "src/app";
  const routes = [];

  function walk(dir, segments) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // Route groups `(group)` and parallel slots are not URL segments.
        const isGroup = /^\(.*\)$/.test(entry.name);
        walk(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name]);
      } else if (
        entry.name === "page.tsx" ||
        entry.name === "page.ts" ||
        entry.name === "route.ts" ||
        entry.name === "route.js"
      ) {
        const file = path.join(dir, entry.name);
        const source = fs.readFileSync(file, "utf8");

        // A "page" that only calls redirect() is a compatibility stub, not a
        // real screen — a config redirect for the same path is harmless.
        const isRedirectStub =
          /import\s*\{[^}]*\bredirect\b[^}]*\}\s*from\s*"next\/navigation"/.test(source) &&
          !/<[A-Za-z]/.test(source);

        if (isRedirectStub) continue;

        const route = "/" + segments.join("/");
        routes.push(route === "/" ? "/" : route.replace(/\/$/, ""));
      }
    }
  }

  walk(root, []);
  return routes;
}

test("the short admin paths redirect to their Meta Suite screens", () => {
  const map = new Map(redirects().map((r) => [r.source, r.destination]));

  assert.equal(map.get("/admin/ads"), "/admin/meta/ads");
  assert.equal(map.get("/admin/events"), "/admin/meta/events");
  assert.equal(map.get("/admin/catalog"), "/admin/meta/catalog");
});

/** Matches a concrete path against a Next.js route pattern (supports [param] and [...catchAll]). */
function matchesRoute(pattern, target) {
  const p = pattern.split("/").filter(Boolean);
  const t = target.split("/").filter(Boolean);

  let i = 0;
  let j = 0;
  while (i < p.length && j < t.length) {
    const segment = p[i];
    if (/^\[\.\.\..+\]$/.test(segment)) return true; // catch-all swallows the rest
    if (/^\[.+\]$/.test(segment)) {
      i += 1;
      j += 1;
      continue;
    }
    if (segment !== t[j]) return false;
    i += 1;
    j += 1;
  }
  return i === p.length && j === t.length;
}

test("each redirect target is a route that actually exists", () => {
  const routes = realRoutes();

  for (const redirect of redirects()) {
    const target = redirect.destination.split("?")[0].replace(/\/$/, "");
    assert.ok(
      routes.some((route) => matchesRoute(route, target)),
      `redirect ${redirect.source} points at ${target}, which is not a real route`
    );
  }
});

test("no redirect shadows a real page", () => {
  const routes = new Set(realRoutes());

  for (const redirect of redirects()) {
    assert.ok(
      !routes.has(redirect.source),
      `${redirect.source} is both a redirect and a real page — the page would never render`
    );
  }
});

test("the Meta Suite screens the aliases point at still exist", () => {
  for (const page of [
    "src/app/admin/meta/ads/page.tsx",
    "src/app/admin/meta/events/page.tsx",
    "src/app/admin/meta/catalog/page.tsx",
  ]) {
    assert.ok(fs.existsSync(page), `${page} must exist`);
  }
});
