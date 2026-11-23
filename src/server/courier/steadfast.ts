import {
  buildRecipientAddress,
  extractSteadfastPayloadError,
  mapSteadfastStatus,
  normalizeBdPhone,
  type ShipmentStatus,
} from "./steadfast-utils";
import type {
  BulkShipmentInputItem,
  BulkShipmentResultItem,
  CourierAdapter,
  CreateShipmentInput,
  CreateShipmentResult,
  CourierBalanceResult,
  CourierError,
  ShipmentStatusResult,
} from "./types";

/**
 * Steadfast courier adapter.
 *
 * Credentials are read from server-only environment variables and never leave
 * this module. Responses are parsed tolerantly because Steadfast returns the
 * consignment either at the root or inside `data` / `consignment`.
 */

const DEFAULT_BASE_URL = "https://portal.packzy.com/api/v1";
const TIMEOUT_MS = 8_000;
const RECOVERY_TIMEOUT_MS = 5_000;

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObjectArray(value: unknown): Raw[] {
  return Array.isArray(value) ? value.filter(isObject) : isObject(value) ? [value] : [];
}

function readString(source: Raw, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function readNumber(source: Raw, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "string" ? Number(value) : value;
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function candidates(payload: unknown): Raw[] {
  const root = isObject(payload) ? payload : {};
  return [
    root,
    ...asObjectArray(root.data),
    ...asObjectArray(root.consignment),
    ...asObjectArray(root.order),
    ...asObjectArray(root.result),
  ];
}

export interface SteadfastConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

export function getSteadfastConfig(): SteadfastConfig {
  return {
    apiKey: (process.env.STEADFAST_API_KEY || "").trim(),
    secretKey: (process.env.STEADFAST_SECRET_KEY || "").trim(),
    baseUrl: (process.env.STEADFAST_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ""),
  };
}

export function isSteadfastConfigured(): boolean {
  const config = getSteadfastConfig();
  return Boolean(config.apiKey && config.secretKey && config.baseUrl);
}

export interface NormalisedCreatedShipment {
  consignmentId: string | null;
  trackingCode: string | null;
  rawStatus: string | null;
  status: ShipmentStatus;
  deliveryCharge: number | null;
}

export function normaliseSteadfastCreate(payload: unknown): NormalisedCreatedShipment {
  const list = candidates(payload);
  const read = (keys: string[]) => {
    for (const candidate of list) {
      const value = readString(candidate, keys);
      if (value) return value;
    }
    return null;
  };
  const rawStatus = read(["status", "delivery_status", "deliveryStatus"]);
  const consignmentId = read(["consignment_id", "consignmentId", "cid"]);
  const trackingCode = read(["tracking_code", "trackingCode", "tracking_id"]);
  const mappedStatus = mapSteadfastStatus(rawStatus);

  // Steadfast's create_order echoes a numeric HTTP-like `status` (e.g. 200),
  // which the mapper reports as "unknown". A create that returned a
  // consignment id IS a booked consignment — its first real courier status
  // arrives with the first status sync. Never report a fresh booking as
  // "unknown" (that status is reserved for removed/indeterminate parcels).
  const status: ShipmentStatus =
    mappedStatus === "unknown" && (consignmentId || trackingCode)
      ? "booked"
      : mappedStatus;

  return {
    consignmentId,
    trackingCode,
    rawStatus,
    status,
    deliveryCharge: (() => {
      for (const candidate of list) {
        const value = readNumber(candidate, ["delivery_charge", "deliveryCharge"]);
        if (value !== null) return value;
      }
      return null;
    })(),
  };
}

export function normaliseSteadfastStatus(payload: unknown): {
  rawStatus: string | null;
  status: ShipmentStatus;
} {
  const list = candidates(payload);
  const read = (keys: string[]) => {
    for (const candidate of list) {
      const value = readString(candidate, keys);
      if (value) return value;
    }
    return null;
  };
  const rawStatus = read(["delivery_status", "status", "deliveryStatus"]);
  return { rawStatus, status: mapSteadfastStatus(rawStatus) };
}

function readError(payload: unknown): string {
  const extracted = extractSteadfastPayloadError(payload);
  if (extracted?.message) return extracted.message;
  const list = candidates(payload);
  for (const candidate of list) {
    const nested = extractSteadfastPayloadError(candidate);
    if (nested?.message) return nested.message;
    const message =
      readString(candidate, ["message", "error", "detail"]) ||
      readString(candidate, ["failedreason"]);
    if (message) return message;
  }
  return "";
}

function classify(status: number, payload: unknown, fallback: string): CourierError {
  const extracted = extractSteadfastPayloadError(payload);
  const message = extracted?.message || readError(payload) || fallback;
  const effectiveStatus = status === 200 && extracted?.statusCode ? extracted.statusCode : status;
  const lower = message.toLowerCase();
  if (lower.includes("invoice") && (lower.includes("exist") || lower.includes("duplicate"))) {
    return { code: "duplicate", message: "This order already has a consignment at Steadfast." };
  }
  if (effectiveStatus === 401 || effectiveStatus === 403) {
    return { code: "auth", message: "Steadfast rejected the API credentials." };
  }
  if (effectiveStatus === 429) {
    return { code: "rate-limited", message: "Steadfast is rate limiting requests. Try again shortly." };
  }
  if (effectiveStatus === 400 || effectiveStatus === 422) {
    return { code: "validation", message: message || "Steadfast rejected the shipment details." };
  }
  return { code: "upstream", message: message || "Steadfast is unavailable right now." };
}

async function requestOnce(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number }
): Promise<{ status: number; payload: unknown; error?: CourierError }> {
  const config = getSteadfastConfig();
  if (!isSteadfastConfigured()) {
    return {
      status: 0,
      payload: null,
      error: {
        code: "not-configured",
        message: "Steadfast credentials are not configured on the server.",
      },
    };
  }

  const effectiveTimeout = init.timeoutMs || TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Api-Key": config.apiKey,
        "Secret-Key": config.secretKey,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        status: response.status,
        payload,
        error: classify(response.status, payload, `Steadfast returned HTTP ${response.status}.`),
      };
    }

    // Steadfast / Packzy occasionally responds with HTTP 200 and `{ status: 400, errors: {...} }`.
    const embeddedError = extractSteadfastPayloadError(payload);
    if (embeddedError && embeddedError.statusCode && embeddedError.statusCode >= 400) {
      return {
        status: embeddedError.statusCode,
        payload,
        error: classify(
          embeddedError.statusCode,
          payload,
          `Steadfast rejected the request (${embeddedError.statusCode}).`
        ),
      };
    }

    return { status: response.status, payload };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      status: 0,
      payload: null,
      error: {
        code: aborted ? "timeout" : "upstream",
        message: aborted
          ? "Steadfast did not respond in time."
          : "Could not reach Steadfast.",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function request(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number }
): Promise<{ status: number; payload: unknown; error?: CourierError }> {
  const first = await requestOnce(path, init);
  if (
    init.method === "GET" &&
    first.error &&
    (first.error.code === "timeout" || first.error.code === "upstream" || first.status >= 500)
  ) {
    return requestOnce(path, init);
  }
  return first;
}

export const steadfastAdapter: CourierAdapter = {
  provider: "steadfast",

  isConfigured: isSteadfastConfigured,

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
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
        error: {
          code: "validation",
          message: "Recipient address is too short for a courier booking.",
        },
      };
    }

    // Safety Pre-flight: Check if this invoice was already created at Steadfast
    // (e.g. from an earlier interrupted or timed-out request) before blindly posting /create_order.
    const preCheck = await getSteadfastStatusByInvoice(input.orderNumber);
    if (preCheck && (preCheck.consignmentId || preCheck.trackingCode)) {
      return {
        ok: true,
        consignmentId: preCheck.consignmentId,
        trackingCode: preCheck.trackingCode,
        status: preCheck.status === "pending" ? "created" : preCheck.status,
        deliveryCharge: preCheck.deliveryCharge,
        raw: preCheck as unknown as Record<string, unknown>,
      };
    }

    const codAmount = Math.max(0, Math.round(Number(input.codAmount) || 0));
    const requestBody: Record<string, unknown> = {
      invoice: input.orderNumber,
      recipient_name: input.recipientName.trim().slice(0, 100),
      recipient_phone: phone,
      recipient_address: address,
      cod_amount: codAmount,
    };

    if (input.note) {
      requestBody.note = input.note.trim().slice(0, 200);
    }

    // Supported documented Steadfast optional fields
    const itemDesc = input.itemDescription || input.providerMeta?.itemDescription;
    if (itemDesc && typeof itemDesc === "string") {
      requestBody.item_description = itemDesc.trim().slice(0, 250);
    }
    const lot = input.totalLot ?? input.providerMeta?.totalLot;
    if (typeof lot === "number" && lot > 0) {
      requestBody.total_lot = Math.round(lot);
    }

    // Explicitly guarantee unsupported fields like weight or parcel_type are NEVER sent
    delete requestBody.weight;
    delete requestBody.parcel_type;

    const result = await request("/create_order", {
      method: "POST",
      body: requestBody,
    });

    if (result.error) {
      // Safe timeout/5xx recovery: check if Steadfast actually booked the invoice before timing out.
      if (
        result.error.code === "timeout" ||
        result.error.code === "duplicate" ||
        result.status >= 500
      ) {
        const recovered = await getSteadfastStatusByInvoice(input.orderNumber);
        if (recovered && (recovered.consignmentId || recovered.trackingCode)) {
          return {
            ok: true,
            consignmentId: recovered.consignmentId,
            trackingCode: recovered.trackingCode,
            status: recovered.status === "pending" ? "created" : recovered.status,
            deliveryCharge: recovered.deliveryCharge,
            raw: recovered as unknown as Record<string, unknown>,
          };
        }
      }
      return { ok: false, error: result.error };
    }

    const normalised = normaliseSteadfastCreate(result.payload);
    if (!normalised.consignmentId && !normalised.trackingCode) {
      const recovered = await getSteadfastStatusByInvoice(input.orderNumber);
      if (recovered && (recovered.consignmentId || recovered.trackingCode)) {
        return {
          ok: true,
          consignmentId: recovered.consignmentId,
          trackingCode: recovered.trackingCode,
          status: recovered.status === "pending" ? "created" : recovered.status,
          deliveryCharge: recovered.deliveryCharge,
          raw: recovered as unknown as Record<string, unknown>,
        };
      }
      const extracted = extractSteadfastPayloadError(result.payload);
      return {
        ok: false,
        error: {
          code: extracted ? "validation" : "upstream",
          message:
            extracted?.message || "Steadfast accepted the request but returned no consignment ID.",
        },
      };
    }

    return {
      ok: true,
      consignmentId: normalised.consignmentId,
      trackingCode: normalised.trackingCode,
      status: normalised.status === "pending" ? "created" : normalised.status,
      deliveryCharge: normalised.deliveryCharge,
      raw: normalised as unknown as Record<string, unknown>,
    };
  },

  async getStatus(input): Promise<ShipmentStatusResult> {
    const consignmentId = String(input.consignmentId || "").trim();
    const trackingCode = String(input.trackingCode || "").trim();
    if (!consignmentId && !trackingCode) {
      return {
        ok: false,
        error: { code: "validation", message: "A consignment or tracking code is required." },
      };
    }

    const path = consignmentId
      ? `/status_by_cid/${encodeURIComponent(consignmentId)}`
      : `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`;

    const result = await request(path, { method: "GET" });
    if (result.error) {
      // Note: Steadfast's API responds with HTTP 401 ("Unauthorized Access") when a
      // consignment ID or tracking code is not found or does not belong to the merchant account.
      if (result.status === 401) {
        return {
          ok: false,
          error: {
            code: "validation",
            message: "Consignment or tracking code not found under this Steadfast merchant account.",
          },
        };
      }
      return { ok: false, error: result.error };
    }

    const normalised = normaliseSteadfastStatus(result.payload);
    return {
      ok: true,
      status: normalised.status,
      rawStatus: normalised.rawStatus || undefined,
      raw: isObject(result.payload) ? result.payload : undefined,
    };
  },

  async getBalance(): Promise<CourierBalanceResult> {
    const result = await request("/get_balance", { method: "GET" });
    if (result.error) return { ok: false, error: result.error };

    for (const candidate of candidates(result.payload)) {
      const balance = readNumber(candidate, ["current_balance", "balance", "available_balance"]);
      if (balance !== null) {
        return { ok: true, balance, currency: "BDT", isMock: false, simulated: false };
      }
    }
    return {
      ok: false,
      error: { code: "upstream", message: "Steadfast returned no balance value." },
    };
  },
};

/**
 * Looks up an order on Steadfast by merchant `invoice` (`orderNumber`).
 * Used for safe recovery if `/create_order` timed out after Steadfast booked it.
 */
export async function getSteadfastStatusByInvoice(
  invoice: string
): Promise<NormalisedCreatedShipment | null> {
  const clean = String(invoice || "").trim();
  if (!clean || !isSteadfastConfigured()) return null;

  const result = await request(`/status_by_invoice/${encodeURIComponent(clean)}`, {
    method: "GET",
    timeoutMs: RECOVERY_TIMEOUT_MS,
  });
  if (result.error || !result.payload) return null;

  const normalised = normaliseSteadfastCreate(result.payload);
  if (!normalised.consignmentId && !normalised.trackingCode) {
    const statusInfo = normaliseSteadfastStatus(result.payload);
    if (!statusInfo.rawStatus) return null;
    return {
      consignmentId: null,
      trackingCode: null,
      rawStatus: statusInfo.rawStatus,
      status: statusInfo.status,
      deliveryCharge: null,
    };
  }
  return normalised;
}

/**
 * Sends up to 500 parcels per request via Steadfast's `/create_order/bulk-order` endpoint.
 */
export async function createBulkSteadfastShipments(
  items: BulkShipmentInputItem[]
): Promise<{ ok: true; results: BulkShipmentResultItem[] } | { ok: false; error: CourierError }> {
  if (!isSteadfastConfigured()) {
    return {
      ok: false,
      error: {
        code: "not-configured",
        message: "Steadfast credentials are not configured on the server.",
      },
    };
  }
  if (!items.length) return { ok: true, results: [] };

  const results: BulkShipmentResultItem[] = [];
  for (let i = 0; i < items.length; i += 500) {
    const chunk = items.slice(i, i + 500);
    const payloadBody = chunk.map((item) => ({
      invoice: item.invoice,
      recipient_name: item.recipientName.trim().slice(0, 100),
      recipient_phone: normalizeBdPhone(item.recipientPhone) || item.recipientPhone,
      recipient_address: buildRecipientAddress([item.recipientAddress]),
      cod_amount: Math.max(0, Math.round(Number(item.codAmount) || 0)),
      ...(item.note ? { note: item.note.trim().slice(0, 200) } : {}),
    }));

    const res = await request("/create_order/bulk-order", {
      method: "POST",
      body: { data: JSON.stringify(payloadBody) },
    });

    if (res.error) {
      return { ok: false, error: res.error };
    }

    const root = isObject(res.payload) ? res.payload : {};
    const rows = asObjectArray(root.data ?? res.payload);
    for (const row of rows) {
      const invoice = readString(row, ["invoice"]) || "";
      const norm = normaliseSteadfastCreate(row);
      if (norm.consignmentId || norm.trackingCode) {
        results.push({
          invoice,
          ok: true,
          consignmentId: norm.consignmentId,
          trackingCode: norm.trackingCode,
          status: norm.status === "pending" ? "created" : norm.status,
        });
      } else {
        results.push({
          invoice,
          ok: false,
          consignmentId: null,
          trackingCode: null,
          error: readString(row, ["error", "message"]) || "Rejected by Steadfast bulk API",
        });
      }
    }
  }

  return { ok: true, results };
}
