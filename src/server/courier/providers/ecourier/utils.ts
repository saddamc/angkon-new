import type { ShipmentStatus } from "../steadfast/utils";

/**
 * Pure eCourier status mapping — no DB or secret imports so it can be unit-tested directly.
 */
export function mapEcourierStatus(raw: unknown): ShipmentStatus {
  const status = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (status) {
    case "placed":
    case "pending":
    case "created":
      return "created";
    case "picked":
    case "picked_up":
    case "in_transit":
    case "transit":
    case "hub":
      return "in_transit";
    case "out_for_delivery":
    case "delivery_on_the_way":
      return "out_for_delivery";
    case "delivered":
    case "cash_delivered":
      return "delivered";
    case "partial_delivered":
      return "partial_delivered";
    case "hold":
    case "on_hold":
      return "hold";
    case "returned":
    case "return_to_merchant":
      return "returned";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}
