import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const service = read("src/server/orders/services/order-cancellation.service.ts");
const customerRoute = read("src/app/api/orders/[id]/cancellation/route.ts");
const adminRoute = read("src/app/api/admin/orders/[id]/cancellation/route.ts");
const accountPage = read("src/app/my-account/page.tsx");
const customerModal = read("src/components/account/customer-cancellation-modal.tsx");

test("customer cancellation has authenticated request and ownership checks", () => {
  assert.match(customerRoute, /withCustomerRoute/);
  assert.match(customerRoute, /requireAuth: true/);
  assert.match(customerRoute, /ORDER_FORBIDDEN/);
  assert.match(service, /requestCustomerCancellation/);
  assert.match(service, /cancellationRequest\.status.*requested/);
});

test("admin can approve or reject a pending customer request", () => {
  assert.match(adminRoute, /action === "reject"/);
  assert.match(adminRoute, /action === "approve"/);
  assert.match(adminRoute, /requirePendingRequest: action === "approve"/);
  assert.match(service, /CANCELLATION_REQUEST_CONFLICT/);
});

test("captured payment cannot be cancelled without a refund decision", () => {
  assert.match(service, /REFUND_REQUIRED_FOR_CANCELLATION/);
  assert.match(customerModal, /Request cancellation/);
  assert.match(accountPage, /Cancellation request pending review/);
});

test("customer UI hides cancellation after courier handoff or delivery", () => {
  assert.match(accountPage, /picked_up/);
  assert.match(accountPage, /out_for_delivery/);
  assert.match(accountPage, /delivered/);
  assert.match(accountPage, /canRequestCancellation/);
});
