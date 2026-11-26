import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCustomerCancellationEligibility } from "../src/server/orders/workflow.ts";

test("pending/confirmed unpaid COD order without shipment is instantly customer-cancellable", () => {
  for (const status of ["pending", "on-hold", "confirmed"]) {
    const res = evaluateCustomerCancellationEligibility({
      orderStatus: status,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      paidAmount: 0,
      shipmentStatus: "not_booked",
      shipmentBookingState: "not_booked",
    });
    assert.equal(res.canCancel, true, `Expected ${status} unpaid order to be cancellable`);
    assert.equal(res.mode, "instant");
  }
});

test("confirmed paid SSLCOMMERZ order before processing & courier booking opens cancellation request mode", () => {
  const res = evaluateCustomerCancellationEligibility({
    orderStatus: "confirmed",
    paymentMethod: "sslcommerz",
    paymentStatus: "paid",
    paidAmount: 8880,
    shipmentStatus: "not_booked",
    shipmentBookingState: "not_booked",
  });
  assert.equal(res.canCancel, true);
  assert.equal(res.mode, "request");
});

test("processing and ready_to_ship orders are ALWAYS locked from customer cancellation", () => {
  for (const status of ["processing", "ready_to_ship"]) {
    const res = evaluateCustomerCancellationEligibility({
      orderStatus: status,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      shipmentStatus: "not_booked",
      shipmentBookingState: "not_booked",
    });
    assert.equal(res.canCancel, false, `Expected ${status} order to lock customer cancel`);
    assert.equal(res.code, "ORDER_PROCESSING_LOCKED");
    assert.ok(res.customerNotice);
  }
});

test("any booked, pending-pickup, in-transit, or delivered courier state locks customer cancellation even if status is confirmed", () => {
  for (const shipStatus of [
    "booked",
    "created",
    "pickup_pending",
    "in_review",
    "pending",
    "hold",
    "booking_pending",
  ]) {
    const res = evaluateCustomerCancellationEligibility({
      orderStatus: "ready_to_ship",
      paymentMethod: "sslcommerz",
      paymentStatus: "paid",
      shipmentStatus: shipStatus,
      shipmentBookingState: "booked",
      trackingCode: "SFR261126STEBB8957BD",
    });
    assert.equal(res.canCancel, false, `Expected booked shipment (${shipStatus}) to lock cancel`);
    assert.equal(res.code, "COURIER_BOOKED_LOCKED");
    assert.ok(res.customerNotice?.includes("SFR261126STEBB8957BD"));
  }

  for (const transitStatus of ["picked_up", "in_transit", "out_for_delivery"]) {
    const res = evaluateCustomerCancellationEligibility({
      orderStatus: "shipped",
      shipmentStatus: transitStatus,
      shipmentBookingState: "booked",
    });
    assert.equal(res.canCancel, false);
    assert.equal(res.code, "SHIPMENT_IN_TRANSIT");
  }

  const delivered = evaluateCustomerCancellationEligibility({
    orderStatus: "delivered",
    shipmentStatus: "delivered",
  });
  assert.equal(delivered.canCancel, false);
  assert.equal(delivered.code, "DELIVERED_REQUIRES_RETURN_WORKFLOW");
});

test("cancelled shipment allows pre-processing re-eligibility while pending request enables withdraw", () => {
  const afterCourierCancel = evaluateCustomerCancellationEligibility({
    orderStatus: "confirmed",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    shipmentStatus: "cancelled",
    shipmentBookingState: "cancelled",
    consignmentId: "SF-OLD",
  });
  assert.equal(afterCourierCancel.canCancel, true);
  assert.equal(afterCourierCancel.mode, "instant");

  const pendingReview = evaluateCustomerCancellationEligibility({
    orderStatus: "confirmed",
    paymentMethod: "sslcommerz",
    paymentStatus: "paid",
    paidAmount: 2500,
    shipmentStatus: "not_booked",
    cancellationRequest: { status: "requested" },
  });
  assert.equal(pendingReview.canCancel, false);
  assert.equal(pendingReview.canWithdraw, true);
  assert.equal(pendingReview.requestPending, true);
});
