import type { CourierError, ShipmentStatus } from "../../core/types";

export interface RedxConfig {
  token: string;
  baseUrl: string;
  defaultAreaId: string;
  defaultAreaName: string;
  pickupStoreId?: string;
  sandbox?: boolean;
}

/**
 * Shared provider capability flags for RedX Courier.
 */
export interface RedxCapabilityFlags {
  hasWeightRequirement: boolean;
  supportsTrackingWebhook: boolean;
  supportsCodSettlement: boolean;
  supportsAreaSelection: boolean;
  requiresPickupStore: boolean;
}

export const REDX_CAPABILITIES: Readonly<RedxCapabilityFlags> = Object.freeze({
  hasWeightRequirement: true,
  supportsTrackingWebhook: true,
  supportsCodSettlement: true,
  supportsAreaSelection: true,
  requiresPickupStore: true,
});

export interface RedxAreaItem {
  id: number;
  name: string;
  zoneId?: number;
  districtName?: string;
}

export interface RedxParcelDraft {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  areaId: number;
  cashCollectionAmount: number;
  parcelWeightKg: number;
  value: number;
  merchantInvoiceId: string;
  instructions?: string;
}

export type RedxBookingResult =
  | {
      ok: true;
      trackingId: string;
      consignmentId?: string;
      status: ShipmentStatus;
      deliveryCharge?: number;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      error: CourierError;
    };
