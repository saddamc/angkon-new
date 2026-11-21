import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canTransitionOrderStatus,
  checkCourierBookingEligibility,
  computeOrderFinancials,
  getAllowedNextStatuses,
} from "../src/server/orders/workflow.ts";
import {
  COURIER_PROVIDER_LIST,
  normalizeCourierSettings,
} from "../src/server/courier/tracking.ts";

const read = (file) => fs.readFileSync(file, "utf8");

test("Rule 1: cancelled and refunded orders cannot be booked with courier", () => {
  for (const status of ["cancelled", "refunded"]) {
    const res = checkCourierBookingEligibility({
      orderStatus: status,
      shipmentStatus: "none",
      shipmentBookingState: "not_booked",
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, "ORDER_CANCELLED");
  }
});

test("Rule 2: unconfirmed (pending / on-hold / failed) orders cannot be booked with courier", () => {
  for (const status of ["pending", "on-hold", "failed"]) {
    const res = checkCourierBookingEligibility({
      orderStatus: status,
      shipmentStatus: "none",
      shipmentBookingState: "not_booked",
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, "ORDER_UNCONFIRMED");
  }
});

test("Rule 3: only confirmed, processing, and ready_to_ship orders are eligible for booking", () => {
  for (const okStatus of ["confirmed", "processing", "ready_to_ship"]) {
    const res = checkCourierBookingEligibility({
      orderStatus: okStatus,
      shipmentStatus: "none",
      shipmentBookingState: "not_booked",
    });
    assert.equal(res.ok, true);
  }

  for (const blocked of ["shipped", "delivered", "completed", "returned"]) {
    const res = checkCourierBookingEligibility({
      orderStatus: blocked,
      shipmentStatus: "none",
      shipmentBookingState: "not_booked",
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, "ORDER_NOT_ELIGIBLE");
  }
});

test("Rules 4, 5, 6: COD calculates accurately from outstanding balance, zero for paid online, remaining for partial payments", () => {
  // Verified paid online order -> zero COD
  const paidOnline = computeOrderFinancials({
    total: 1500,
    paymentMethod: "sslcommerz",
    paymentStatus: "paid",
    orderStatus: "confirmed",
    paidAmount: 0,
  });
  assert.equal(paidOnline.isPrepaidVerified, true);
  assert.equal(paidOnline.advancePaidAmount, 1500);
  assert.equal(paidOnline.outstandingAmount, 0);
  assert.equal(paidOnline.codAmountToCollect, 0);

  // Partially paid order -> remaining COD = total - paidAmount
  const partialOrder = computeOrderFinancials({
    total: 1500,
    paymentMethod: "cod",
    paymentStatus: "partially_paid",
    orderStatus: "ready_to_ship",
    paidAmount: 400,
  });
  assert.equal(partialOrder.isPartiallyPaid, true);
  assert.equal(partialOrder.isPrepaidVerified, false);
  assert.equal(partialOrder.advancePaidAmount, 400);
  assert.equal(partialOrder.outstandingAmount, 1100);
  assert.equal(partialOrder.codAmountToCollect, 1100);

  // Full pending COD
  const fullCod = computeOrderFinancials({
    total: 980,
    paymentMethod: "cod",
    paymentStatus: "pending",
    orderStatus: "confirmed",
  });
  assert.equal(fullCod.outstandingAmount, 980);
  assert.equal(fullCod.codAmountToCollect, 980);
  assert.equal(fullCod.codSettlementStatus, "expected");

  // Cancelled order has zero collectible COD
  const cancelledCod = computeOrderFinancials({
    total: 980,
    paymentMethod: "cod",
    paymentStatus: "pending",
    orderStatus: "cancelled",
  });
  assert.equal(cancelledCod.codAmountToCollect, 0);
});

test("Rules 7 & 8: duplicate consignments and in-flight timeout bookings are prevented", () => {
  const inProgress = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    shipmentBookingState: "booking_in_progress",
  });
  assert.equal(inProgress.ok, false);
  assert.equal(inProgress.code, "BOOKING_IN_PROGRESS");

  const dupByConsignment = checkCourierBookingEligibility({
    orderStatus: "processing",
    shipmentBookingState: "not_booked",
    shipmentStatus: "created",
    consignmentId: "SF-9988",
  });
  assert.equal(dupByConsignment.ok, false);
  assert.equal(dupByConsignment.code, "DUPLICATE_SHIPMENT");

  // Cancelled previous consignment CAN be re-booked once order is eligible
  const rebookAfterCancel = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    shipmentBookingState: "cancelled",
    shipmentStatus: "cancelled",
    consignmentId: "SF-OLD",
    hasActiveShipmentRow: false,
  });
  assert.equal(rebookAfterCancel.ok, true);
});

test("Stage 2 workflow transitions allow forward paths and prevent invalid jumps", () => {
  assert.equal(canTransitionOrderStatus("pending", "confirmed"), true);
  assert.equal(canTransitionOrderStatus("confirmed", "processing"), true);
  assert.equal(canTransitionOrderStatus("processing", "ready_to_ship"), true);
  assert.equal(canTransitionOrderStatus("ready_to_ship", "shipped"), true);
  assert.equal(canTransitionOrderStatus("shipped", "delivered"), true);
  assert.equal(canTransitionOrderStatus("delivered", "returned"), true);

  assert.equal(canTransitionOrderStatus("cancelled", "shipped"), false);
  assert.equal(canTransitionOrderStatus("delivered", "pending"), false);
  assert.equal(canTransitionOrderStatus("refunded", "confirmed"), false);
  assert.deepEqual(getAllowedNextStatuses("cancelled"), []);
});

test("Stage 3 & Stage 7 courier UI list exposes only Steadfast active and Pathao disabled", () => {
  assert.ok(COURIER_PROVIDER_LIST.length >= 2, "Must expose registered courier providers");
  const steadfast = COURIER_PROVIDER_LIST.find((p) => p.id === "steadfast");
  const pathao = COURIER_PROVIDER_LIST.find((p) => p.id === "pathao");
  assert.ok(steadfast?.supported === true);
  assert.ok(pathao?.supported === false);

  const norm = normalizeCourierSettings({
    defaultProvider: "pathao",
    enabledProviders: { steadfast: true, pathao: true },
    insideDhakaCharge: 70,
    outsideDhakaCharge: 130,
  });
  assert.equal(norm.defaultProvider, "steadfast");
  assert.equal(norm.enabledProviders.pathao, false);
  assert.equal(norm.insideDhakaCharge, 70);
  assert.equal(norm.outsideDhakaCharge, 130);
});

test("Stage 5 & Rules 9, 10, 11, 12 enforced in CourierService, sync, and admin APIs", () => {
  const service = read("src/server/courier/courier-service.ts");
  const sync = read("src/server/courier/sync.ts");
  const settlementRoute = read("src/app/api/admin/orders/[id]/settlement/route.ts");
  const detailsRoute = read("src/app/api/admin/orders/[id]/details/route.ts");
  const manualPayRoute = read("src/app/api/admin/orders/[id]/payments/manual/route.ts");

  assert.ok(service.includes("checkCourierBookingEligibility"));
  assert.ok(service.includes("computeOrderFinancials"));
  assert.ok(service.includes('shipmentBookingState: "booking_in_progress"'));
  assert.ok(service.includes('shipmentBookingState: "booking_failed"'));
  assert.ok(service.includes("AdminAuditLog.create"));
  assert.ok(service.includes("[REDACTED]"));

  // Rule 10: delivery updates codSettlementStatus to collected, never settled automatically
  assert.ok(sync.includes('orderUpdate.orderStatus = "delivered"'));
  assert.ok(sync.includes('orderUpdate.codSettlementStatus = "collected"'));
  assert.ok(!sync.includes('orderUpdate.codSettlementStatus = "settled"'));

  // Rule 11 & 12: admin session + audit log on settlement and manual payments
  assert.ok(settlementRoute.includes("requireAdminSessionCore"));
  assert.ok(settlementRoute.includes("AdminAuditLog.create"));
  assert.ok(detailsRoute.includes("requireAdminSessionCore"));
  assert.ok(manualPayRoute.includes("requireAdminSessionCore"));
  assert.ok(manualPayRoute.includes("AdminAuditLog.create"));
});
