import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Contract: manual (admin) order creation must be authenticated, rate-limited,
 * price-authoritative, stock-atomic, audited, and must never initiate a payment
 * gateway session.
 */

const read = (file) => fs.readFileSync(file, "utf8");
const route = read("src/app/api/admin/orders/route.ts");

test("admin manual order: POST handler is admin-session gated", () => {
  assert.match(route, /export async function POST\(/);
  const postBlock = route.slice(route.indexOf("export async function POST("));
  assert.ok(
    postBlock.includes("requireAdminSessionCore(request)"),
    "manual order creation must require an admin session"
  );
});

test("admin manual order: rate limiter fails closed", () => {
  assert.match(route, /admin-order-create:ip:/);
  assert.match(route, /failClosed:\s*true/);
  assert.ok(route.includes("createRateLimitResponse"));
});

test("admin manual order: prices resolved server-side from the catalog", () => {
  assert.ok(route.includes("getAllDbProducts()"), "must resolve the authoritative catalog");
  assert.ok(route.includes("REAL_PRODUCTS"), "must keep a catalog fallback");
  assert.ok(
    route.includes("parseFloat(rawPriceStr)"),
    "unit price must come from the matched catalog product, not the browser"
  );
});

test("admin manual order: stock is reserved and committed atomically", () => {
  assert.ok(route.includes("reserveStockForOrder"));
  assert.ok(route.includes("commitStockForOrder"));
  assert.ok(route.includes("restoreReservedItems"), "failed inserts must roll stock back");
});

test("admin manual order: audited with the order.create action", () => {
  assert.ok(route.includes("AdminAuditLog.create"));
  assert.ok(route.includes('action: "order.create"'));
});

test("admin manual order: never initiates a payment gateway session", () => {
  const postBlock = route.slice(route.indexOf("export async function POST("));
  assert.ok(!postBlock.includes("initiateSslcommerzForOrder"));
  assert.ok(!postBlock.includes("InitiatePaymentService"));
  assert.ok(postBlock.includes("channel: \"admin\""));
});

test("admin manual order: summary exposes KPI trends", () => {
  assert.ok(route.includes("totalOrders7d"));
  assert.ok(route.includes("deliveredPrev7d"));
  assert.ok(route.includes("readyToBookCount"));
  assert.ok(route.includes("inTransitCount"));
});

test("create order modal: auto-loads catalog and handles both array and wrapped formats", () => {
  const modalSource = read("src/app/admin/orders/_components/create-order-modal.tsx");
  assert.ok(modalSource.includes("loadCatalog()"), "must auto-load catalog on modal open");
  assert.ok(modalSource.includes("/api/admin/products"), "must fetch from admin products endpoint");
  assert.ok(modalSource.includes("/api/products"), "must have public products endpoint fallback");
  assert.ok(modalSource.includes("Array.isArray(data)"), "must handle direct array responses");
  assert.ok(modalSource.includes("availableSizes"), "must support product size variations");
  assert.ok(modalSource.includes("autoShippingFee"), "must compute smart delivery fee based on city");
});
