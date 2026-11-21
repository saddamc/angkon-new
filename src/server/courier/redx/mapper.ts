import type { ShipmentStatus } from "../types";
import type { CreateShipmentInput, CreatedShipment } from "../types";
import type { RedxParcelDraft } from "./types";
import { normalizeBdPhone, buildRecipientAddress } from "../steadfast-utils";

/**
 * Maps raw RedX parcel status strings to normalized ShipmentStatus enum.
 * Pure mapping function safe for unit tests without network or DB dependencies.
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

/**
 * Maps generic CreateShipmentInput into RedX parcel draft structure.
 * Pure mapper — does not send network requests or invent unconfirmed schemas.
 */
export function mapRedxCreatePayload(input: CreateShipmentInput): RedxParcelDraft {
  const areaId = Number(input.providerMeta?.areaId) || 0;
  return {
    customerName: input.recipientName.trim(),
    customerPhone: normalizeBdPhone(input.recipientPhone) || input.recipientPhone.trim(),
    deliveryAddress: buildRecipientAddress([input.recipientAddress]),
    areaId,
    cashCollectionAmount: Math.max(0, Math.round(Number(input.codAmount) || 0)),
    parcelWeightKg: Number(input.packageWeight) || 0.5,
    value: Math.max(0, Math.round(Number(input.codAmount) || 0)),
    merchantInvoiceId: input.orderNumber,
    instructions: input.note?.trim() || undefined,
  };
}

/**
 * Maps raw RedX API response object to standardized CreatedShipment structure.
 */
export function mapRedxResponse(payload: Record<string, unknown>): CreatedShipment {
  const trackingId =
    typeof payload.tracking_id === "string"
      ? payload.tracking_id
      : typeof payload.trackingId === "string"
      ? payload.trackingId
      : null;

  const consignmentId =
    typeof payload.consignment_id === "string"
      ? payload.consignment_id
      : typeof payload.id === "string"
      ? payload.id
      : trackingId;

  const rawStatus = payload.status;
  const status = mapRedxStatus(rawStatus);

  const deliveryCharge =
    typeof payload.delivery_charge === "number"
      ? payload.delivery_charge
      : typeof payload.charge === "number"
      ? payload.charge
      : null;

  return {
    consignmentId,
    trackingCode: trackingId,
    status,
    deliveryCharge,
    raw: payload,
  };
}
