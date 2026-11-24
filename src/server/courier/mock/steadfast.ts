/**
 * ANGKON — Mock Steadfast Provider (Development & Automated Testing)
 * 
 * Complies with MODE 1: MOCK / DEVELOPMENT specifications:
 * - Default for local development and automated testing.
 * - NEVER sends requests to the real Steadfast API (zero external HTTP traffic).
 * - Simulates successful bookings with unambiguous `MOCK-` identifiers.
 * - Simulates failed bookings, timeouts, duplicate booking conflicts, and validation errors.
 * - Simulates full tracking lifecycle: pickup, in-transit, delivered, and returned.
 * - Supports controlled failure injection for automated unit and integration tests.
 * - Explicitly tags every mock shipment with `isMock: true`, `mode: "mock"`, and `[TEST/MOCK]`.
 */

import {
  mapSteadfastStatus,
  normalizeBdPhone,
  buildRecipientAddress,
  type ShipmentStatus,
} from "../providers/steadfast/utils";
import type {
  CourierAdapter,
  CreateShipmentInput,
  CreateShipmentResult,
  ShipmentStatusResult,
  CourierBalanceResult,
  CancelShipmentResult,
} from "../core/types";

export type MockSteadfastFailureMode =
  | "none"
  | "timeout"
  | "validation"
  | "duplicate"
  | "auth"
  | "upstream";

export interface MockConsignmentState {
  consignmentId: string;
  trackingCode: string;
  orderNumber: string;
  status: ShipmentStatus;
  rawStatus: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  deliveryCharge: number;
  createdAt: Date;
  updatedAt: Date;
}

export class MockSteadfastProvider implements CourierAdapter {
  readonly provider = "steadfast" as const;
  readonly isMock = true;

  private failureMode: MockSteadfastFailureMode = "none";
  private customErrorMessage: string | null = null;
  private httpCallCount = 0;

  // In-memory registry for mock consignments and simulated status transitions
  private mockStore = new Map<string, MockConsignmentState>();

  /**
   * Resets the mock store and failure injection state (useful between tests).
   */
  reset(): void {
    this.failureMode = "none";
    this.customErrorMessage = null;
    this.httpCallCount = 0;
    this.mockStore.clear();
  }

  /**
   * Configure simulated failure mode for automated testing.
   */
  setFailureMode(mode: MockSteadfastFailureMode, customErrorMessage?: string): void {
    this.failureMode = mode;
    this.customErrorMessage = customErrorMessage || null;
  }

  getFailureMode(): MockSteadfastFailureMode {
    return this.failureMode;
  }

  /**
   * Returns how many external HTTP calls were attempted (always 0 for Mock provider).
   */
  getHttpCallCount(): number {
    return this.httpCallCount;
  }

  /**
   * Manually transition a mock consignment's tracking status to simulate courier events.
   * (e.g. "picked_up", "in_transit", "delivered", "returned", "cancelled").
   */
  simulateStatusUpdate(
    consignmentIdOrTracking: string,
    status: ShipmentStatus | string,
    rawStatus?: string
  ): boolean {
    const key = (consignmentIdOrTracking || "").trim();
    const entry = this.mockStore.get(key);
    if (!entry) return false;

    const normalised = mapSteadfastStatus(String(status));
    entry.status = normalised;
    entry.rawStatus = rawStatus || String(status);
    entry.updatedAt = new Date();

    // Ensure both consignmentId and trackingCode keys are synchronized in the mock store
    this.mockStore.set(entry.consignmentId, entry);
    this.mockStore.set(entry.trackingCode, entry);
    return true;
  }

  isConfigured(): boolean {
    // Mock adapter is always considered configured in development
    return true;
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    // 1. Failure injection checks for automated tests
    if (this.failureMode === "timeout") {
      return {
        ok: false,
        error: {
          code: "timeout",
          message: this.customErrorMessage || "Simulated Steadfast request timeout in development mode.",
        },
      };
    }

    if (this.failureMode === "duplicate") {
      return {
        ok: false,
        error: {
          code: "duplicate",
          message: this.customErrorMessage || "This order already has a consignment at Steadfast.",
        },
      };
    }

    if (this.failureMode === "auth") {
      return {
        ok: false,
        error: {
          code: "auth",
          message: this.customErrorMessage || "Steadfast rejected the API credentials (simulated mock auth failure).",
        },
      };
    }

    if (this.failureMode === "upstream") {
      return {
        ok: false,
        error: {
          code: "upstream",
          message: this.customErrorMessage || "Steadfast is unavailable right now (simulated 500 error).",
        },
      };
    }

    if (this.failureMode === "validation") {
      return {
        ok: false,
        error: {
          code: "validation",
          message: this.customErrorMessage || "Steadfast rejected the shipment details (simulated validation error).",
        },
      };
    }

    // 2. Validate Bangladeshi phone number format
    const phone = normalizeBdPhone(input.recipientPhone);
    if (!phone) {
      return {
        ok: false,
        error: {
          code: "validation",
          message: "Recipient phone must be a valid 11-digit Bangladeshi mobile number.",
        },
      };
    }

    // 3. Validate recipient address length
    const address = buildRecipientAddress([input.recipientAddress]);
    if (address.length < 10) {
      return {
        ok: false,
        error: {
          code: "validation",
          message: "Recipient address is too short for a courier booking.",
        },
      };
    }

    // 4. Duplicate prevention within mock store
    for (const item of this.mockStore.values()) {
      if (item.orderNumber === input.orderNumber && !["cancelled", "returned", "failed"].includes(item.status)) {
        return {
          ok: false,
          error: {
            code: "duplicate",
            message: `Order #${input.orderNumber} already has an active mock consignment (${item.consignmentId}).`,
          },
        };
      }
    }

    // 5. Generate deterministic mock consignment & tracking codes
    const timestamp = Date.now().toString().slice(-6);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const consignmentId = `MOCK-CID-${input.orderNumber}-${rand}`;
    const trackingCode = `MOCK-TRK-${input.orderNumber}-${timestamp}`;
    const deliveryCharge = 100; // Simulated flat 100 BDT courier charge

    const record: MockConsignmentState = {
      consignmentId,
      trackingCode,
      orderNumber: input.orderNumber,
      status: "created",
      rawStatus: "in_review",
      recipientName: input.recipientName,
      recipientPhone: phone,
      recipientAddress: address,
      codAmount: input.codAmount,
      deliveryCharge,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockStore.set(consignmentId, record);
    this.mockStore.set(trackingCode, record);

    return {
      ok: true,
      consignmentId,
      trackingCode,
      status: "created",
      deliveryCharge,
      raw: {
        isMock: true,
        mode: "mock",
        tag: "TEST / MOCK CONSIGNMENT",
        orderNumber: input.orderNumber,
        consignment_id: consignmentId,
        tracking_code: trackingCode,
        delivery_charge: deliveryCharge,
        status: "in_review",
        recipient_name: input.recipientName,
        recipient_phone: phone,
        recipient_address: address,
        cod_amount: input.codAmount,
        note: input.note || "",
        createdAt: record.createdAt.toISOString(),
      },
    };
  }

  async getStatus(input: {
    consignmentId?: string | null;
    trackingCode?: string | null;
  }): Promise<ShipmentStatusResult> {
    const key = String(input.consignmentId || input.trackingCode || "").trim();
    if (!key) {
      return {
        ok: false,
        error: { code: "validation", message: "A consignment or tracking code is required." },
      };
    }

    if (this.failureMode === "timeout") {
      return {
        ok: false,
        error: { code: "timeout", message: "Mock tracking query timeout." },
      };
    }

    const record = this.mockStore.get(key);
    if (!record) {
      // By default, if an unregistered mock key is queried:
      return {
        ok: true,
        status: "pending",
        rawStatus: "in_review",
        raw: {
          isMock: true,
          mode: "mock",
          tag: "TEST / MOCK CONSIGNMENT",
          consignment_id: input.consignmentId || null,
          tracking_code: input.trackingCode || null,
          status: "in_review",
        },
      };
    }

    return {
      ok: true,
      status: record.status,
      rawStatus: record.rawStatus,
      raw: {
        isMock: true,
        mode: "mock",
        tag: "TEST / MOCK CONSIGNMENT",
        consignment_id: record.consignmentId,
        tracking_code: record.trackingCode,
        status: record.rawStatus,
        updatedAt: record.updatedAt.toISOString(),
      },
    };
  }

  async getBalance(): Promise<CourierBalanceResult> {
    return {
      ok: true,
      balance: 50000,
      currency: "BDT",
      isMock: true,
      simulated: true,
    };
  }

  async cancelShipment(input: {
    consignmentId?: string | null;
    orderNumber?: string;
    reason?: string;
  }): Promise<CancelShipmentResult> {
    const key = String(input.consignmentId || "").trim();
    if (key && this.mockStore.has(key)) {
      this.simulateStatusUpdate(key, "cancelled", "cancelled");
    }

    return {
      ok: true,
      status: "cancelled",
      message: `[MOCK] Consignment ${key || input.orderNumber || "parcel"} was cancelled in development mode.`,
    };
  }
}

/** Singleton instance for application runtime */
export const mockSteadfastProvider = new MockSteadfastProvider();
