import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

/**
 * Product `description` / `short_description` are stored HTML rendered with
 * `dangerouslySetInnerHTML` on the public product page. They arrive from admin
 * edits, imports and feeds, so they must be sanitised on the server before the
 * browser ever sees them.
 */

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return nextResolve(
        pathToFileURL(path.resolve("tests/stubs/server-only-stub.mjs")).href,
        context
      );
    }
    return nextResolve(specifier, context);
  },
});

const { sanitizeProductHtml, stripProductHtml } = await import(
  "../src/lib/security/sanitize-product-html.ts"
);

test("sanitise: script tags and their contents are removed", () => {
  const out = sanitizeProductHtml('<p>Hello</p><script>alert("xss")</script>');

  assert.ok(!out.includes("<script"));
  assert.ok(!out.includes("alert"));
  assert.ok(out.includes("<p>Hello</p>"));
});

test("sanitise: inline event handlers are removed", () => {
  const out = sanitizeProductHtml('<img src="https://cdn.example.com/a.jpg" onerror="alert(1)">');

  assert.ok(!out.includes("onerror"));
  assert.ok(out.includes("https://cdn.example.com/a.jpg"));
});

test("sanitise: javascript: links are neutralised", () => {
  const out = sanitizeProductHtml('<a href="javascript:alert(1)">click</a>');

  assert.ok(!out.includes("javascript:"));
  assert.ok(out.includes("click"));
});

test("sanitise: outbound links get a safe rel", () => {
  const out = sanitizeProductHtml('<a href="https://example.com/x">external</a>');

  assert.ok(out.includes('rel="noopener noreferrer nofollow"'));
  assert.ok(out.includes('href="https://example.com/x"'));
});

test("sanitise: size-chart tables survive intact", () => {
  const html =
    '<table><thead><tr><th>Size</th><th>Chest</th></tr></thead>' +
    "<tbody><tr><td>M</td><td>38</td></tr></tbody></table>";

  const out = sanitizeProductHtml(html);

  assert.ok(out.includes("<table>"));
  assert.ok(out.includes("<thead>"));
  assert.ok(out.includes("<th>Size</th>"));
  assert.ok(out.includes("<td>38</td>"));
});

test("sanitise: normal formatting and lists are preserved", () => {
  const out = sanitizeProductHtml(
    "<p><strong>Pure silk</strong> with <em>hand embroidery</em></p><ul><li>Dry clean</li></ul>"
  );

  assert.ok(out.includes("<strong>Pure silk</strong>"));
  assert.ok(out.includes("<em>hand embroidery</em>"));
  assert.ok(out.includes("<ul><li>Dry clean</li></ul>"));
});

test("sanitise: iframes, styles and inline style attributes are dropped", () => {
  const out = sanitizeProductHtml(
    '<iframe src="https://evil.example"></iframe><style>body{display:none}</style>' +
      '<p style="background:url(javascript:alert(1))">text</p>'
  );

  assert.ok(!out.includes("<iframe"));
  assert.ok(!out.includes("<style"));
  assert.ok(!out.includes("style="));
  assert.ok(out.includes("text"));
});

test("sanitise: data: image URLs are rejected", () => {
  const out = sanitizeProductHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">');

  assert.ok(!out.includes("data:image"));
});

test("sanitise: empty or missing input returns an empty string", () => {
  assert.equal(sanitizeProductHtml(""), "");
  assert.equal(sanitizeProductHtml(null), "");
  assert.equal(sanitizeProductHtml(undefined), "");
});

test("strip: markup is removed for plain-text consumers such as JSON-LD", () => {
  const out = stripProductHtml("<p>A <strong>silk</strong> saree</p><script>x</script>");

  assert.equal(out, "A silk saree");
});

test("product page sanitises both description fields before rendering", async () => {
  const fs = await import("node:fs");
  const source = fs.readFileSync("src/app/products/[slug]/page.tsx", "utf8");

  assert.ok(
    source.includes("sanitizeProductHtml(product.description)"),
    "description must be sanitised on the server"
  );
  assert.ok(
    source.includes("sanitizeProductHtml(product.short_description)"),
    "short_description must be sanitised on the server"
  );
  assert.ok(
    /<ProductDetailsView[\s\S]{0,400}description:\s*sanitizeProductHtml/.test(source),
    "the sanitised values must be the ones passed to the client component"
  );
});
