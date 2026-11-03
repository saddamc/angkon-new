import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

/**
 * JSON-LD is injected with `dangerouslySetInnerHTML`, which is correct — it is
 * structured data, not HTML, so DOMPurify must never touch it.
 *
 * The actual hazard is script-element breakout: a product name containing
 * `</script>` would close the tag early and let the rest of the string run as
 * markup. Escaping `<`, `>`, `&`, U+2028 and U+2029 keeps the payload valid
 * JSON-LD while making that impossible.
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

const { serializeJsonLd } = await import("../src/lib/seo/json-ld.ts");

test("json-ld: a </script> in any field cannot terminate the script element", () => {
  const output = serializeJsonLd({
    "@type": "Product",
    name: "</script><script>alert('xss')</script>",
  });

  assert.ok(!output.includes("</script>"), "the literal closing tag must be gone");
  assert.ok(output.includes("\\u003c/script\\u003e"), "it is escaped, not deleted");
});

test("json-ld: the escaped output is still valid, equivalent JSON", () => {
  const source = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: 'Saree & "Kurta" <limited>',
    offers: { price: "1250", priceCurrency: "BDT" },
  };

  const parsed = JSON.parse(serializeJsonLd(source));

  assert.deepEqual(parsed, source, "escaping must not change the data");
});

test("json-ld: U+2028 / U+2029 are escaped (they break JS string literals)", () => {
  const output = serializeJsonLd({ text: "line\u2028separator\u2029paragraph" });

  assert.ok(!output.includes("\u2028"));
  assert.ok(!output.includes("\u2029"));
  assert.ok(output.includes("\\u2028"));
  assert.ok(output.includes("\\u2029"));
});

test("json-ld: undefined degrades to JSON null instead of throwing", () => {
  assert.equal(serializeJsonLd(undefined), "null");
});

test("json-ld: ampersands are escaped too", () => {
  const output = serializeJsonLd({ name: "Silk & Cotton" });
  assert.ok(!output.includes("&"));
  assert.ok(output.includes("\\u0026"));
});

test("json-ld: every JSON-LD script tag in the app uses the safe serialiser", async () => {
  const fs = await import("node:fs");

  const pages = [
    "src/app/page.tsx",
    "src/app/products/[slug]/page.tsx",
    "src/app/product-category/[...slug]/page.tsx",
  ];

  for (const page of pages) {
    const source = fs.readFileSync(page, "utf8");
    assert.ok(
      !/type="application\/ld\+json"[\s\S]{0,120}JSON\.stringify/.test(source),
      `${page} must not JSON.stringify directly into a JSON-LD script tag`
    );
    assert.ok(
      source.includes("serializeJsonLd("),
      `${page} must use the escaping serialiser`
    );
  }
});
