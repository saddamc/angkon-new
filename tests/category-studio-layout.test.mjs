import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Category Studio layout contract.
 *
 * The studio previously rendered Save/Cancel twice — once in the header and
 * again in the footer — and the panel was taller than its scroll container, so
 * the footer sat below the fold and could never be reached.
 */

const STUDIO = "src/app/admin/categories/CategoryStudio.tsx";
const source = fs.readFileSync(STUDIO, "utf8");

test("studio: the header no longer duplicates Save/Cancel", () => {
  const occurrences = (source.match(/Save Changes/g) ?? []).length;
  assert.equal(occurrences, 1, "Save Changes must appear once, in the footer only");
});

test("studio: the footer is pinned and always visible", () => {
  assert.ok(
    source.includes("sticky bottom-0"),
    "the action bar must stick to the bottom of the scroll area"
  );
  assert.ok(
    source.includes("max-h-[calc(100dvh-7rem)]"),
    "the panel must be bounded so its footer fits the viewport"
  );
  assert.ok(
    source.includes("overflow-hidden"),
    "the panel clips and scrolls internally rather than pushing the footer off-screen"
  );
});

test("studio: opening the studio brings it into view", () => {
  assert.ok(source.includes("panelRef"), "the panel needs a ref");
  assert.ok(
    source.includes("scrollIntoView({ block: \"start\""),
    "opening must scroll the panel to the top so the pinned footer is reachable"
  );
});

test("studio: save is guarded and shows loading state", () => {
  assert.ok(source.includes("disabled={saving}"), "actions disable while saving");
  assert.ok(source.includes("Saving…") && source.includes("Creating…"), "a saving label is shown");
});
