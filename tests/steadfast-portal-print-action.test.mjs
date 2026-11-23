/** Steadfast print links must use the official portal; no guessed API routes. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const action = read("src/app/admin/orders/_components/courier-print-action.tsx");
const row = read("src/app/admin/orders/_components/order-row.tsx");
const details = read("src/app/admin/orders/_components/order-details-content.tsx");
const modal = read("src/app/admin/orders/_components/orders-modals.tsx");

test("Steadfast print action opens the official merchant portal instead of a fake local report", () => {
  assert.ok(action.includes('"https://steadfast.com.bd/login"'));
  assert.ok(action.includes('target="_blank"'));
  assert.ok(action.includes('rel="noopener noreferrer"'));
  assert.ok(action.includes('provider === "steadfast"'));
  assert.ok(action.includes("Open Steadfast"));
});

test("all Steadfast print actions use the portal-aware component", () => {
  assert.ok(row.includes("<CourierPrintAction"));
  assert.ok(details.includes("<CourierPrintAction"));
  assert.ok(modal.includes("<CourierPrintAction"));
  assert.ok(!row.includes("printCourierLabel("));
  assert.ok(!details.includes("printCourierLabel("));
  assert.ok(!modal.includes("printCourierLabel("));
});
