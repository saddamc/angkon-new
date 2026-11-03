/**
 * Serialises structured data for a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` alone is not safe inside a script element: any value that
 * contains `</script>` closes the tag early and lets the remainder of the
 * string execute as markup (CWE-79). JSON permits `<`, `>` and `&` to be
 * written as `\uXXXX`, so escaping them keeps the payload byte-for-byte valid
 * JSON-LD while making it impossible to terminate the script element.
 *
 * This is the escaping Next.js recommends for JSON-LD, and it is *not* the same
 * problem that HTML sanitisation solves — never run DOMPurify over JSON-LD.
 */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value) ?? "null";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
