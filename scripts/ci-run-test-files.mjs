/**
 * CI Diagnostic Test Runner for `tests/*.test.mjs`.
 * Executes every `.test.mjs` file individually with per-file timing and a
 * bounded per-file timeout so CI logs reveal immediately where execution stops
 * or slows down without masking any test failure.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PER_FILE_TIMEOUT_MS = 60_000;
const testDir = path.resolve(process.cwd(), "tests");
const files = fs
  .readdirSync(testDir)
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();

if (files.length === 0) {
  console.error("No .test.mjs files found under tests/");
  process.exit(1);
}

const timings = [];
let failedFiles = 0;

for (const file of files) {
  const relPath = path.join("tests", file);
  console.log(`\n==> Running ${relPath}`);
  const startedAt = Date.now();
  const res = spawnSync(process.execPath, ["--test", relPath], {
    stdio: "inherit",
    timeout: PER_FILE_TIMEOUT_MS,
  });
  const elapsedMs = Date.now() - startedAt;
  const timedOut = Boolean(res.error && res.error.code === "ETIMEDOUT");

  if (timedOut) {
    failedFiles += 1;
    console.error(`==> TIMEOUT ${relPath} after ${elapsedMs}ms (limit ${PER_FILE_TIMEOUT_MS}ms)`);
  } else if (res.status !== 0) {
    failedFiles += 1;
    console.error(`==> FAIL ${relPath} (exit=${res.status ?? "null"}, ${elapsedMs}ms)`);
  } else {
    console.log(`==> PASS ${relPath} (${elapsedMs}ms)`);
  }

  timings.push({ file: relPath, elapsedMs, ok: !timedOut && res.status === 0 });
}

const totalMs = timings.reduce((acc, item) => acc + item.elapsedMs, 0);
const slowest = [...timings].sort((a, b) => b.elapsedMs - a.elapsedMs).slice(0, 10);

console.log("\n=== CI Per-File Timing Summary ===");
console.log(`Files executed: ${timings.length} | Failed: ${failedFiles} | Total: ${totalMs}ms`);
for (const entry of slowest) {
  console.log(`  ${String(entry.elapsedMs).padStart(6)}ms  ${entry.ok ? "PASS" : "FAIL"}  ${entry.file}`);
}

if (failedFiles > 0) {
  process.exit(1);
}
