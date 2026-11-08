import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Inventory guard for every `dangerouslySetInnerHTML` in the app.
 *
 * `dangerouslySetInnerHTML` is legitimate for JSON-LD and for a CSS-in-JS
 * <style> block; it is not legitimate for arbitrary stored HTML. This test
 * pins the current set so a new site cannot appear without a deliberate
 * decision (and a sanitiser) — the audit flagged eight of these.
 */

const ALLOWED = new Map([
  // JSON-LD structured data — escaped by serializeJsonLd, never sanitised.
  // /src/app/page.tsx no longer needs this: React 19 emits <script> children
  // verbatim, so the organisation schema is now a plain child.
  ["src/app/products/[slug]/page.tsx", "application/ld+json"],
  ["src/app/product-category/[...slug]/page.tsx", "application/ld+json"],
  // Static Meta Pixel bootstrap; the interpolated id is validated as numeric.
  ["src/components/analytics/facebook-pixel.tsx", "facebook-pixel"],
  // CSS-in-JS <style> block built from useId() and developer theme colours.
  ["src/components/ui/chart.tsx", "chart-style"],
  // Product copy — sanitised on the server before it reaches this component.
  ["src/components/product/product-details-view.tsx", "sanitised-product-html"],
]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const sites = walk("src")
  .filter((file) => fs.readFileSync(file, "utf8").includes("dangerouslySetInnerHTML={{"))
  .map((file) => file.replace(/\\/g, "/"))
  .sort();

test("every dangerouslySetInnerHTML site is a known, reviewed one", () => {
  for (const site of sites) {
    assert.ok(
      ALLOWED.has(site),
      `${site} uses dangerouslySetInnerHTML but is not in the reviewed allow-list`
    );
  }
});

test("no reviewed site has silently disappeared without updating the inventory", () => {
  for (const site of ALLOWED.keys()) {
    assert.ok(
      sites.includes(site),
      `${site} no longer uses dangerouslySetInnerHTML — update the inventory`
    );
  }
});

test("the audit's dead code is gone: PageHeader no longer injects raw HTML", () => {
  const source = fs.readFileSync("src/components/sections/page-header.tsx", "utf8");

  assert.ok(!source.includes("dangerouslySetInnerHTML"));
  assert.ok(!source.includes("descriptionHtml"));
});

test("the Meta Pixel id is validated before it is interpolated into a script", () => {
  const source = fs.readFileSync("src/components/analytics/facebook-pixel.tsx", "utf8");

  assert.ok(
    source.includes("safePixelId"),
    "the pixel id must pass through a validated variable"
  );
  assert.ok(
    /\^\\d\{5,20\}\$/.test(source) || source.includes("/^\\d{5,20}$/"),
    "the pixel id must be constrained to digits"
  );
  // The raw, unvalidated id must never reach the inline script.
  assert.ok(
    !/fbq\('init', '\$\{activePixelId\}'\)/.test(source),
    "fbq('init') must not interpolate the raw pixel id"
  );
});

test("product HTML is sanitised with an allow-list, not a regex strip", () => {
  const source = fs.readFileSync("src/lib/security/sanitize-product-html.ts", "utf8");

  assert.ok(source.includes('import "server-only"'), "sanitiser must stay server-only");
  assert.ok(source.includes("sanitize-html"), "use a maintained sanitiser");
  assert.ok(source.includes("allowedTags"), "an explicit allow-list is required");
  assert.ok(
    !source.includes("allowedTags: false"),
    "never disable the allow-list"
  );
});
