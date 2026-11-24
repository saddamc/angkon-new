import type { ShipmentStatus } from "../providers/steadfast/utils";
export type { ShipmentStatus };

export type CourierProvider = "steadfast" | "pathao" | "redx" | "ecourier";

export interface CourierProviderMeta {
  cityId?: number;
  zoneId?: number;
  areaId?: number;
  areaName?: string;
  deliveryType?: number;
  itemWeight?: number;
  parcelType?: string;
  packageWeight?: number;
  packagingType?: string;
  weightEstimated?: boolean;
  manualEstimateReason?: string;
  itemDescription?: string;
  totalLot?: number;
}

export type CourierErrorCode =
  | "not-configured"
  | "auth"
  | "validation"
  | "duplicate"
  | "rate-limited"
  | "timeout"
  | "upstream";

export interface CourierError {
  code: CourierErrorCode;
  message: string;
}

export interface CreateShipmentInput {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
  itemDescription?: string;
  totalLot?: number;
  parcelType?: string;
  packageWeight?: number;
  weightEstimated?: boolean;
  providerMeta?: CourierProviderMeta;
}

export interface BulkShipmentInputItem {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
}

export interface BulkShipmentResultItem {
  invoice: string;
  ok: boolean;
  consignmentId: string | null;
  trackingCode: string | null;
  status?: ShipmentStatus;
  error?: string;
}

export interface CreatedShipment {
  consignmentId: string | null;
  trackingCode: string | null;
  status: ShipmentStatus;
  deliveryCharge: number | null;
  raw: Record<string, unknown>;
}

export type CreateShipmentResult =
  | ({ ok: true } & CreatedShipment)
  | { ok: false; error: CourierError };

export interface ShipmentStatusResult {
  ok: boolean;
  status?: ShipmentStatus;
  rawStatus?: string;
  raw?: Record<string, unknown>;
  error?: CourierError;
}

export interface CourierBalanceResult {
  ok: boolean;
  balance?: number;
  currency?: string;
  isMock?: boolean;
  simulated?: boolean;
  error?: CourierError;
}

export interface CancelShipmentResult {
  ok: boolean;
  status: ShipmentStatus | "cancelled";
  message: string;
  error?: CourierError;
}

export interface CourierAdapter {
  provider: CourierProvider;
  isConfigured(): boolean;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  getStatus(input: {
    consignmentId?: string | null;
    trackingCode?: string | null;
  }): Promise<ShipmentStatusResult>;
  getBalance(): Promise<CourierBalanceResult>;
  cancelShipment?(input: {
    consignmentId?: string | null;
    orderNumber?: string;
    reason?: string;
  }): Promise<CancelShipmentResult>;
}

/** Provider-independent contract required by Stage 3 multi-courier architecture. */
export type CourierProviderContract = CourierAdapter;
