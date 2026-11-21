import type { ShipmentStatus } from "./steadfast-utils";

/**
 * Pure RedX helpers — no imports of DB or secrets so they can be unit-tested directly.
 */
export function mapRedxStatus(raw: unknown): ShipmentStatus {
  const status = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (status) {
    case "ready_for_delivery":
    case "created":
    case "pickup_pending":
      return "created";
    case "pickup_in_progress":
    case "picked_up":
    case "in_transit":
    case "received_at_hub":
    case "dispatched":
      return "in_transit";
    case "delivery_in_progress":
    case "out_for_delivery":
      return "out_for_delivery";
    case "delivered":
    case "agent_delivered":
      return "delivered";
    case "partial_delivered":
    case "partially_delivered":
      return "partial_delivered";
    case "agent_hold":
    case "hold":
    case "on_hold":
      return "hold";
    case "returned":
    case "return_in_progress":
    case "returning":
      return "returned";
    case "cancelled":
    case "canceled":
    case "pickup_cancelled":
      return "cancelled";
    case "failed":
    case "delivery_failed":
      return "failed";
    default:
      return "pending";
  }
}
