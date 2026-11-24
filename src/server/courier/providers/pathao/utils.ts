import type { ShipmentStatus } from "@/server/courier/providers/steadfast/utils";

/** Pure Pathao status mapping (kept import-free for tests). */
export function mapPathaoStatus(raw: unknown): ShipmentStatus {
  const status = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (status) {
    case "delivered":
      return "delivered";
    case "partial_delivered":
      return "partial_delivered";
    case "cancelled":
    case "canceled":
    case "cancel":
      return "cancelled";
    case "hold":
    case "on_hold":
      return "hold";
    case "in_review":
      return "in_review";
    case "picked":
    case "pickup_requested":
    case "in_transit":
    case "transit":
    case "assigned_for_pickup":
      return "in_transit";
    case "out_for_delivery":
      return "out_for_delivery";
    case "return":
    case "returned":
    case "return_in_transit":
      return "returned";
    case "pending":
    case "created":
      return "pending";
    default:
      return "pending";
  }
}
