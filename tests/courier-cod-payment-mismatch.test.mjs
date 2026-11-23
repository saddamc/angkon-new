/**
 * Prevent shipping a consignment whose stored COD exceeds the order's live
 * collectible balance after a payment was recorded post-booking.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const ordersApi = read("src/app/api/admin/orders/route.ts");
const orderPatchApi = read("src/app/api/admin/orders/[id]/route.ts");
const orderRow = read("src/app/admin/orders/_components/order-row.tsx");
const statusModal = read("src/app/admin/orders/_components/orders-modals.tsx");
const printLabel = read("src/app/admin/orders/_components/print-label.ts");

test("orders list flags paid orders when the active courier COD exceeds the live balance", () => {
  assert.ok(ordersApi.includes('import { Shipment } from "@/models/Shipment"'));
  assert.ok(ordersApi.includes('shipmentCodAmount > financials.codAmountToCollect + 0.009'));
  assert.ok(ordersApi.includes("shipmentCodMismatch"));
});

test("server blocks marking an over-collecting courier consignment shipped", () => {
  assert.ok(orderPatchApi.includes('code: "COURIER_COD_PAYMENT_MISMATCH"'));
  assert.ok(orderPatchApi.includes("courierCollectible > currentCollectible + 0.009"));
  assert.ok(orderPatchApi.includes('body.paymentStatus === "paid"'));
  assert.ok(orderPatchApi.includes("Cancel the consignment in the courier portal and rebook it"));
});

test("admin status UI warns clearly and disables the Shipped choice", () => {
  assert.ok(statusModal.includes("Stop — courier COD does not match payment"));
  assert.ok(statusModal.includes('["ready_to_ship", "shipped"].includes(s.key)'));
  assert.ok(statusModal.includes("isCodMismatchLocked"));
  assert.ok(orderRow.includes("COD mismatch"));
});

test("courier slip cannot print a false zero-COD or prepaid label during a mismatch", () => {
  assert.ok(printLabel.includes("courierCodMismatch"));
  assert.ok(printLabel.includes("Label blocked: this courier consignment is set to collect"));
  assert.ok(printLabel.includes("return;"));
});
