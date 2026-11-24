import type { IShipment } from "@/models/Shipment";

/** Admin-safe shipment shape: no raw provider payloads or credentials. */
export function serializeShipment(shipment: IShipment) {
  return {
    id: String(shipment._id),
    provider: shipment.provider,
    status: shipment.status,
    consignmentId: shipment.consignmentId || null,
    trackingCode: shipment.trackingCode || null,
    providerShipmentId: shipment.providerShipmentId || shipment.consignmentId || null,
    packageWeight: shipment.packageWeight ?? (shipment.providerMeta as { packageWeight?: number } | null)?.packageWeight ?? null,
    parcelCategory: shipment.parcelCategory || (shipment.providerMeta as { parcelType?: string } | null)?.parcelType || null,
    packagingType: shipment.packagingType || (shipment.providerMeta as { packagingType?: string } | null)?.packagingType || null,
    codAmount: shipment.codAmount || 0,
    deliveryCharge: shipment.deliveryCharge ?? null,
    recipientName: shipment.recipientName,
    recipientPhone: shipment.recipientPhone,
    recipientAddress: shipment.recipientAddress,
    note: shipment.note || "",
    providerMeta: shipment.providerMeta || null,
    events: (shipment.events || []).map((event) => ({
      status: event.status,
      at: event.at,
      note: event.note || "",
    })),
    lastSyncedAt: shipment.lastSyncedAt || null,
    mode: shipment.mode || "mock",
    isMock: shipment.isMock ?? true,
    confirmedByAdmin: Boolean(shipment.confirmedByAdmin),
    confirmedByAdminId: shipment.confirmedByAdminId || null,
    confirmedAt: shipment.confirmedAt || null,
    error: shipment.error || null,
    createdAt: shipment.createdAt || null,
    updatedAt: shipment.updatedAt || null,
  };
}
