import { buildRecipientAddress, normalizeBdPhone } from "./steadfast-utils";
import { mapEcourierStatus } from "./ecourier-utils";
import type {
  CourierAdapter,
  CreateShipmentInput,
  CreateShipmentResult,
  CourierBalanceResult,
  CourierError,
  ShipmentStatusResult,
} from "./types";

const DEFAULT_BASE_URL = "https://backoffice.ecourier.com.bd/api";
const TIMEOUT_MS = 12_000;

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: Raw, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

export interface EcourierConfig {
  apiKey: string;
  apiSecret: string;
  userId: string;
  baseUrl: string;
}

export function getEcourierConfig(): EcourierConfig {
  return {
    apiKey: (process.env.ECOURIER_API_KEY || "").trim(),
    apiSecret: (process.env.ECOURIER_API_SECRET || "").trim(),
    userId: (process.env.ECOURIER_USER_ID || "").trim(),
    baseUrl: (process.env.ECOURIER_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ""),
  };
}

export function isEcourierConfigured(): boolean {
  const c = getEcourierConfig();
  return Boolean(c.apiKey && c.apiSecret && c.userId && c.baseUrl);
}

function headers(c: EcourierConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "API-KEY": c.apiKey,
    "API-SECRET": c.apiSecret,
    "USER-ID": c.userId,
  };
}

function classify(status: number, payload: unknown, fallback: string): CourierError {
  const root = isObject(payload) ? payload : {};
  const msg = readString(root, ["message", "error", "errors", "detail"]) || fallback;
  if (status === 401 || status === 403) {
    return { code: "auth", message: "eCourier rejected the API credentials." };
  }
  if (status === 429) {
    return { code: "rate-limited", message: "eCourier is rate limiting requests. Try again shortly." };
  }
  if (status === 400 || status === 422) {
    return { code: "validation", message: msg };
  }
  return { code: "upstream", message: msg };
}

export const ecourierAdapter: CourierAdapter = {
  provider: "ecourier",

  isConfigured: isEcourierConfigured,

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const config = getEcourierConfig();
    if (!isEcourierConfigured()) {
      return {
        ok: false,
        error: { code: "not-configured", message: "eCourier credentials are not configured on the server." },
      };
    }

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

    const address = buildRecipientAddress([input.recipientAddress]);
    if (address.length < 10) {
      return {
        ok: false,
        error: { code: "validation", message: "Recipient address is too short for a courier booking." },
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const codAmount = Math.max(0, Math.round(Number(input.codAmount) || 0));
      const response = await fetch(`${config.baseUrl}/order-place`, {
        method: "POST",
        headers: headers(config),
        body: JSON.stringify({
          recipient_name: input.recipientName.trim().slice(0, 100),
          recipient_mobile: phone,
          recipient_city: "Dhaka",
          recipient_area: "Dhaka",
          recipient_thana: "Dhaka",
          recipient_address: address,
          package_code: process.env.ECOURIER_PACKAGE_CODE || "#2416",
          product_price: codAmount,
          payment_method: codAmount > 0 ? "COD" : "MPAY",
          product_id: input.orderNumber,
          comments: input.note ? input.note.slice(0, 200) : "",
        }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          error: classify(response.status, payload, `eCourier returned HTTP ${response.status}.`),
        };
      }

      const root = isObject(payload) ? payload : {};
      const id = readString(root, ["ID", "id", "tracking_id", "ecr"]);
      if (!id) {
        return {
          ok: false,
          error: { code: "upstream", message: "eCourier accepted the request but returned no tracking ID." },
        };
      }

      return {
        ok: true,
        consignmentId: id,
        trackingCode: id,
        status: "created",
        deliveryCharge: null,
        raw: root,
      };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        error: {
          code: aborted ? "timeout" : "upstream",
          message: aborted ? "eCourier did not respond in time." : "Could not reach eCourier.",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async getStatus(input): Promise<ShipmentStatusResult> {
    const config = getEcourierConfig();
    if (!isEcourierConfigured()) {
      return {
        ok: false,
        error: { code: "not-configured", message: "eCourier credentials are not configured on the server." },
      };
    }

    const tracking = String(input.trackingCode || input.consignmentId || "").trim();
    if (!tracking) {
      return {
        ok: false,
        error: { code: "validation", message: "An eCourier tracking ID is required." },
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${config.baseUrl}/track`, {
        method: "POST",
        headers: headers(config),
        body: JSON.stringify({ ecr: tracking }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          error: classify(response.status, payload, `eCourier returned HTTP ${response.status}.`),
        };
      }
      const root = isObject(payload) ? payload : {};
      const queryData = isObject(root.query_data) ? root.query_data : root;
      const statusList = Array.isArray(queryData.status) ? queryData.status : [];
      const latest = statusList.length && isObject(statusList[0]) ? statusList[0] : queryData;
      const rawStatus = readString(latest, ["status", "delivery_status"]);
      return {
        ok: true,
        status: mapEcourierStatus(rawStatus),
        rawStatus: rawStatus || undefined,
        raw: root,
      };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        error: {
          code: aborted ? "timeout" : "upstream",
          message: aborted ? "eCourier did not respond in time." : "Could not reach eCourier.",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async getBalance(): Promise<CourierBalanceResult> {
    return {
      ok: false,
      error: { code: "upstream", message: "eCourier does not expose a merchant wallet balance endpoint." },
    };
  },
};
