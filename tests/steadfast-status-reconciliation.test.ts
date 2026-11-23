import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapSteadfastStatus,
  evaluateShipmentTransition,
} from "../src/server/courier/steadfast-utils";
import { normaliseSteadfastCreate } from "../src/server/courier/steadfast";

describe("Steadfast Status Mapping & Reconciliation Engine", () => {
  it("Steadfast API: 'unknown' stays indeterminate — never disguised as 'in_review'", () => {
    // Live evidence: Steadfast's status API returns literal "in_review" for
    // ACTIVE consignments and "unknown" for consignments REMOVED in the
    // merchant portal. Coercing unknown→in_review hid portal cancellations
    // (the parcel looked healthy after the admin removed it at Steadfast).
    assert.equal(mapSteadfastStatus("unknown"), "unknown");
    assert.equal(mapSteadfastStatus("in_review"), "in_review");
    assert.equal(mapSteadfastStatus("In Review"), "in_review");
    assert.equal(mapSteadfastStatus("in-review"), "in_review");
  });

  it("successful create with a numeric-only status reports 'booked', not 'unknown'", () => {
    // Steadfast's create_order echoes a numeric HTTP-like status (200) with
    // the new consignment id. A fresh booking is "booked"; its first real
    // courier status arrives with the first status sync.
    const created = normaliseSteadfastCreate({
      status: 200,
      consignment_id: "TST123",
      tracking_code: "TRK9",
    });
    assert.equal(created.consignmentId, "TST123");
    assert.equal(created.status, "booked");
  });

  it("Steadfast API: maps 'cancelled' and synonyms accurately", () => {
    assert.equal(mapSteadfastStatus("cancelled"), "cancelled");
    assert.equal(mapSteadfastStatus("canceled"), "cancelled");
    assert.equal(mapSteadfastStatus("cancel"), "cancelled");
    assert.equal(mapSteadfastStatus("cancelled_approval_pending"), "cancelled");
  });

  it("evaluateShipmentTransition: default call blocks transition from cancelled (backward compat)", () => {
    const res = evaluateShipmentTransition("cancelled", "in_review");
    assert.equal(res.allowed, false);
    assert.match(res.reason, /Cannot transition from terminal cancelled state/);

    const transitRes = evaluateShipmentTransition("cancelled", "in_transit");
    assert.equal(transitRes.allowed, false);

    const deliveredRes = evaluateShipmentTransition("cancelled", "delivered");
    assert.equal(deliveredRes.allowed, false);
  });

  it("evaluateShipmentTransition: courier verified sync reconciles active statuses from cancelled", () => {
    // When live Steadfast reports the order is actually in_review, verified sync reconciles it
    const reviewRes = evaluateShipmentTransition("cancelled", "in_review", {
      isCourierVerifiedSync: true,
    });
    assert.equal(reviewRes.allowed, true);
    assert.equal(reviewRes.reason, "courier_sync_reconciliation_from_cancelled");

    // Can reconcile to booked, pickup_pending, picked_up, in_transit, delivered
    const transitRes = evaluateShipmentTransition("cancelled", "in_transit", {
      isCourierVerifiedSync: true,
    });
    assert.equal(transitRes.allowed, true);

    const deliveredRes = evaluateShipmentTransition("cancelled", "delivered", {
      isCourierVerifiedSync: true,
    });
    assert.equal(deliveredRes.allowed, true);
  });

  it("evaluateShipmentTransition: courier cancellation is accepted from any active pre-delivery state", () => {
    const fromReview = evaluateShipmentTransition("in_review", "cancelled");
    assert.equal(fromReview.allowed, true);
    assert.equal(fromReview.reason, "courier_cancelled");

    const fromBooked = evaluateShipmentTransition("booked", "cancelled");
    assert.equal(fromBooked.allowed, true);

    const fromTransit = evaluateShipmentTransition("in_transit", "cancelled");
    assert.equal(fromTransit.allowed, true);

    // Delivered cannot be cancelled
    const fromDelivered = evaluateShipmentTransition("delivered", "cancelled");
    assert.equal(fromDelivered.allowed, false);
    assert.match(fromDelivered.reason, /Cannot cancel a shipment that is already delivered/);
  });
});
