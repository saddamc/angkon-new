import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mapPathaoStatus } from "../src/server/courier/providers/pathao/utils.ts";

/**
 * P3 contract: atomic stock lifecycle, CI typecheck, Pathao adapter.
 */

const read = (file) => fs.readFileSync(file, "utf8");

const stock = read(fs.existsSync("src/server/products/stock.ts") ? "src/server/products/stock.ts" : "src/server/stock.ts");
const ordersRoute = read("src/app/api/orders/route.ts");
const settle = [
  read("src/server/payments/repositories/order-payment.repository.ts"),
  read("src/server/payments/services/finalize-payment.ts"),
].join("\n");
const adminOrder = read("src/app/api/admin/orders/[id]/route.ts");
const courierSync = read((fs.existsSync("src/server/courier/core/sync.ts") ? "src/server/courier/core/sync.ts" : "src/server/courier/sync.ts"));
const orderModel = read("src/models/Order.ts");
const pathao = read((fs.existsSync("src/server/courier/providers/pathao/adapter.ts") ? "src/server/courier/providers/pathao/adapter.ts" : "src/server/courier/pathao.ts"));
const courierIndex = read("src/server/courier/index.ts");
const envExample = read(".env.example");
const nextConfig = read("next.config.ts");
const packageJson = JSON.parse(read("package.json"));

test("stock: atomic guarded decrement with rollback", () => {
  assert.ok(stock.includes("stock_quantity: { $gte: need.quantity }"));
  assert.ok(stock.includes("$inc: { stock_quantity: -need.quantity }"));
  assert.ok(stock.includes("restoreReservedItems(reserved)"));
  assert.ok(stock.includes("insufficient-stock"));
});

test("stock: release and commit are claimed exactly once", () => {
  assert.ok(stock.includes("stockReleasedAt"));
  assert.ok(stock.includes("stockCommittedAt"));
  assert.ok(stock.includes("stockReservedAt: { $exists: true, $ne: null }"));
  assert.ok(orderModel.includes("stockReleasedAt"));
});

test("orders: reserve before create, roll back on failure, release on gateway failure", () => {
  assert.ok(ordersRoute.includes("reserveStockForOrder(itemsData)"));
  assert.ok(ordersRoute.includes('code: "OUT_OF_STOCK"'));
  assert.ok(ordersRoute.includes("restoreReservedItems(reservedStock)"));
  assert.ok(ordersRoute.includes("releaseStockForOrder(newOrder)"));
  assert.ok(ordersRoute.includes("commitStockForOrder(newOrder)"));
  assert.ok(ordersRoute.includes("stockReservedAt: reservedStock.length ? new Date() : null"));
});

test("payment settlement: commit on paid, release on failure", () => {
  assert.ok(settle.includes("commitStockForOrder(claimed)"));
  assert.ok(settle.includes("releaseStockForOrder(order)"));
});

test("admin + courier lifecycle follow stock", () => {
  assert.ok(adminOrder.includes("releaseStockForOrder(orderDoc)"));
  assert.ok(adminOrder.includes("commitStockForOrder(orderDoc)"));
  assert.ok(courierSync.includes("commitStockForOrder(order)"));
  assert.ok(courierSync.includes("releaseStockForOrder(order)"));
});

test("pathao: full provider contract, env-only credentials", () => {
  assert.ok(pathao.includes('provider: "pathao"'));
  assert.ok(pathao.includes("process.env.PATHAO_CLIENT_ID"));
  assert.ok(pathao.includes("process.env.PATHAO_CLIENT_SECRET"));
  assert.ok(pathao.includes("process.env.PATHAO_CITY_ID"));
  assert.ok(pathao.includes("process.env.PATHAO_ZONE_ID"));
  assert.ok(!pathao.includes("NEXT_PUBLIC_PATHAO"), "credentials must never be public");
  assert.ok(courierIndex.includes('case "pathao":'));
});

test("pathao status mapping", () => {
  assert.equal(mapPathaoStatus("Delivered"), "delivered");
  assert.equal(mapPathaoStatus("Pickup_Requested"), "in_transit");
  assert.equal(mapPathaoStatus("In Transit"), "in_transit");
  assert.equal(mapPathaoStatus("Returned"), "returned");
  assert.equal(mapPathaoStatus("Cancelled"), "cancelled");
  assert.equal(mapPathaoStatus("Hold"), "hold");
  assert.equal(mapPathaoStatus("unknown"), "pending");
});

test("env: Pathao credentials are documented server-only", () => {
  for (const key of [
    "PATHAO_CLIENT_ID",
    "PATHAO_CLIENT_SECRET",
    "PATHAO_USERNAME",
    "PATHAO_PASSWORD",
    "PATHAO_STORE_ID",
    "PATHAO_CITY_ID",
    "PATHAO_ZONE_ID",
  ]) {
    assert.ok(envExample.includes(key), `${key} must be documented`);
  }
  assert.ok(!envExample.includes("NEXT_PUBLIC_PATHAO"));
});

test("CI: production builds typecheck again", () => {
  assert.ok(!nextConfig.includes("ignoreBuildErrors"), "Next must not skip TypeScript errors");
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
});
