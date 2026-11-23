import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const mongodbSource = fs.readFileSync("src/lib/mongodb.ts", "utf8");

test("a one-shot system DNS fallback restores the configured resolver afterward", () => {
  assert.ok(mongodbSource.includes("const DNS_OVERRIDE_SERVERS"));
  assert.ok(mongodbSource.includes("dns.setServers(fallbackServers)"));
  assert.ok(mongodbSource.includes("finally {"));
  assert.ok(
    mongodbSource.includes("dns.setServers(DNS_OVERRIDE_SERVERS)"),
    "the fallback must not permanently replace the process's configured DNS resolvers"
  );
});
