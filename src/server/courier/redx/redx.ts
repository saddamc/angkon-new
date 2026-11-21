import type {
  CourierAdapter,
  CreateShipmentInput,
  CreateShipmentResult,
  CourierBalanceResult,
  CourierError,
  ShipmentStatusResult,
} from "../types";
import type { RedxConfig, RedxAreaItem } from "./types";
import { REDX_CAPABILITIES } from "./types";
import { mapRedxStatus } from "./mapper";

const DEFAULT_BASE_URL = "https://openapi.redx.com.bd/v1.0.0-beta";
const TIMEOUT_MS = 12_000;

export function getRedxConfig(): RedxConfig {
  return {
    token: (process.env.REDX_API_TOKEN || "").trim(),
    baseUrl: (process.env.REDX_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ""),
    defaultAreaId: (process.env.REDX_AREA_ID || "").trim(),
    defaultAreaName: (process.env.REDX_AREA_NAME || "").trim(),
    pickupStoreId: (process.env.REDX_PICKUP_STORE_ID || "").trim(),
  };
}

/**
 * Checks whether RedX credentials are fully configured on the server.
 * Requires token and base URL.
 */
export function isRedxConfigured(): boolean {
  const config = getRedxConfig();
  return Boolean(config.token && config.baseUrl);
}

let areaCache: { items: RedxAreaItem[]; expiresAt: number } | null = null;

/**
 * Retrieves RedX delivery areas/hubs.
 * Fail-closed: returns not-configured error if credentials are missing.
 */
export async function getRedxAreas(): Promise<
  { ok: true; items: RedxAreaItem[] } | { ok: false; error: CourierError }
> {
  if (areaCache && Date.now() < areaCache.expiresAt) {
    return { ok: true, items: areaCache.items };
  }
  const config = getRedxConfig();
  if (!isRedxConfigured()) {
    return {
      ok: false,
      error: {
        code: "not-configured",
        message: "RedX credentials are not configured on the server.",
      },
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}/areas`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "upstream",
          message:
            typeof payload.message === "string" ? payload.message : "Failed to load RedX areas.",
        },
      };
    }
    const rawAreas = Array.isArray(payload.areas)
      ? (payload.areas as Array<Record<string, unknown>>)
      : [];
    const items: RedxAreaItem[] = rawAreas
      .map((a) => ({
        id: Number(a.id) || 0,
        name: String(a.name || a.area_name || "").trim(),
        zoneId: typeof a.zone_id === "number" ? a.zone_id : undefined,
        districtName: typeof a.district_name === "string" ? a.district_name : undefined,
      }))
      .filter((a) => a.id > 0 && a.name.length > 0);

    areaCache = { items, expiresAt: Date.now() + 60 * 60 * 1000 };
    return { ok: true, items };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: {
        code: isTimeout ? "timeout" : "upstream",
        message: isTimeout ? "RedX areas lookup timed out." : "Network error contacting RedX.",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * RedX Courier Adapter.
 *
 * STAGE 4 Architecture Specification:
 * - Disabled by default; fail-closed.
 * - Does NOT send live booking requests until official documentation and production credentials are confirmed.
 * - Returns clear "not-configured" / "PROVIDER_NOT_CONFIGURED" error.
 * - Exposes capability flags to UI and dispatch coordinator.
 */
export class RedxAdapter implements CourierAdapter {
  readonly provider = "redx" as const;
  readonly capabilities = REDX_CAPABILITIES;

  isConfigured(): boolean {
    return isRedxConfigured();
  }

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    // Fail-closed gate: Do not permit live booking until official credentials & docs are supplied
    return {
      ok: false,
      error: {
        code: "not-configured",
        message:
          "RedX Courier integration is pending official API documentation and credentials. Setup is required.",
      },
    };
  }

  async getStatus(input: {
    consignmentId?: string | null;
    trackingCode?: string | null;
  }): Promise<ShipmentStatusResult> {
    const trackingId = input.trackingCode || input.consignmentId;
    if (!trackingId) {
      return {
        ok: false,
        error: { code: "validation", message: "A RedX trackingId or consignmentId is required." },
      };
    }

    if (!this.isConfigured()) {
      return {
        ok: false,
        error: {
          code: "not-configured",
          message: "RedX credentials are not configured on the server.",
        },
      };
    }

    const config = getRedxConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(
        `${config.baseUrl}/parcels/${encodeURIComponent(trackingId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "upstream",
            message:
              typeof payload.message === "string"
                ? payload.message
                : "Failed to fetch RedX parcel status.",
          },
        };
      }

      const parcel =
        payload.parcel && typeof payload.parcel === "object"
          ? (payload.parcel as Record<string, unknown>)
          : payload;

      const rawStatus = typeof parcel.status === "string" ? parcel.status : "";
      return {
        ok: true,
        status: mapRedxStatus(rawStatus),
        rawStatus,
        raw: payload,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return {
        ok: false,
        error: {
          code: isTimeout ? "timeout" : "upstream",
          message: isTimeout
            ? "RedX status request timed out."
            : "Network error contacting RedX.",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async getBalance(): Promise<CourierBalanceResult> {
    return {
      ok: false,
      error: {
        code: "not-configured",
        message: "RedX does not expose a prepaid account balance endpoint.",
      },
    };
  }
}

export const redxAdapter = new RedxAdapter();
