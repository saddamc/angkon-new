import { buildRecipientAddress, normalizeBdPhone } from "./steadfast-utils";
import { mapPathaoStatus } from "./pathao-utils";
import type {
  CourierAdapter,
  CreateShipmentInput,
  CreateShipmentResult,
  CourierBalanceResult,
  CourierError,
  ShipmentStatusResult,
} from "./types";

/**
 * Pathao courier adapter (interface-complete, env-gated).
 *
 * Pathao needs numeric city/zone IDs for the recipient, which are not modelled
 * in ANGKON's order data yet. The adapter therefore refuses to create a
 * consignment until `PATHAO_CITY_ID` / `PATHAO_ZONE_ID` are configured; status
 * lookups work as soon as credentials exist. This keeps the provider contract
 * ready without guessing a customer's zone.
 */

const DEFAULT_BASE_URL = "https://api-hermes.pathao.com";
const TIMEOUT_MS = 12_000;

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function candidates(payload: unknown): Raw[] {
  const root = isObject(payload) ? payload : {};
  return [root, ...(isObject(root.data) ? [root.data] : [])];
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

function readAny(payload: unknown, keys: string[]): string | null {
  for (const candidate of candidates(payload)) {
    const value = readString(candidate, keys);
    if (value) return value;
  }
  return null;
}

export interface PathaoConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  baseUrl: string;
  cityId: string;
  zoneId: string;
}

export function getPathaoConfig(): PathaoConfig {
  return {
    clientId: (process.env.PATHAO_CLIENT_ID || "").trim(),
    clientSecret: (process.env.PATHAO_CLIENT_SECRET || "").trim(),
    username: (process.env.PATHAO_USERNAME || "").trim(),
    password: (process.env.PATHAO_PASSWORD || "").trim(),
    storeId: (process.env.PATHAO_STORE_ID || "").trim(),
    baseUrl: (process.env.PATHAO_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ""),
    cityId: (process.env.PATHAO_CITY_ID || "").trim(),
    zoneId: (process.env.PATHAO_ZONE_ID || "").trim(),
  };
}

export function isPathaoConfigured(): boolean {
  const config = getPathaoConfig();
  return Boolean(
    config.clientId &&
      config.clientSecret &&
      config.username &&
      config.password &&
      config.storeId &&
      config.baseUrl
  );
}

function classify(status: number, payload: unknown, fallback: string): CourierError {
  const message =
    readAny(payload, ["message", "error", "errors", "detail"]) || fallback;
  if (status === 401 || status === 403) {
    return { code: "auth", message: "Pathao rejected the API credentials." };
  }
  if (status === 429) {
    return { code: "rate-limited", message: "Pathao is rate limiting requests. Try again shortly." };
  }
  if (status === 400 || status === 422) {
    return { code: "validation", message: message || "Pathao rejected the shipment details." };
  }
  return { code: "upstream", message: message || "Pathao is unavailable right now." };
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<{ ok: true; token: string } | { ok: false; error: CourierError }> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return { ok: true, token: tokenCache.token };
  }

  const config = getPathaoConfig();
  if (!isPathaoConfigured()) {
    return {
      ok: false,
      error: { code: "not-configured", message: "Pathao credentials are not configured on the server." },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        username: config.username,
        password: config.password,
        grant_type: "password",
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        error: classify(response.status, payload, `Pathao token request failed (HTTP ${response.status}).`),
      };
    }
    const token = readAny(payload, ["access_token"]);
    if (!token) {
      return {
        ok: false,
        error: { code: "auth", message: "Pathao returned no access token." },
      };
    }
    const expiresIn = (() => {
      for (const candidate of candidates(payload)) {
        const value = readNumber(candidate, ["expires_in", "expiresIn"]);
        if (value !== null) return value;
      }
      return 3600;
    })();
    tokenCache = { token, expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000 };
    return { ok: true, token };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: {
        code: aborted ? "timeout" : "upstream",
        message: aborted ? "Pathao did not respond in time." : "Could not reach Pathao.",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface NormalisedPathaoShipment {
  consignmentId: string | null;
  trackingCode: string | null;
  rawStatus: string | null;
  deliveryCharge: number | null;
}

export function normalisePathaoCreate(payload: unknown): NormalisedPathaoShipment {
  return {
    consignmentId: readAny(payload, ["consignment_id", "consignmentId"]),
    trackingCode: readAny(payload, ["merchant_order_id", "tracking_code"]),
    rawStatus: readAny(payload, ["order_status", "status"]),
    deliveryCharge: (() => {
      for (const candidate of candidates(payload)) {
        const value = readNumber(candidate, ["delivery_fee", "deliveryCharge"]);
        if (value !== null) return value;
      }
      return null;
    })(),
  };
}

export const pathaoAdapter: CourierAdapter = {
  provider: "pathao",

  isConfigured: isPathaoConfigured,

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const config = getPathaoConfig();
    if (!isPathaoConfigured()) {
      return {
        ok: false,
        error: { code: "not-configured", message: "Pathao credentials are not configured on the server." },
      };
    }
    const cityId = Number(input.providerMeta?.cityId || config.cityId || 0);
    const zoneId = Number(input.providerMeta?.zoneId || config.zoneId || 0);
    const areaId = Number(input.providerMeta?.areaId || 0);

    if (!cityId || !zoneId) {
      return {
        ok: false,
        error: {
          code: "validation",
          message:
            "Pathao requires a City and Zone selection for the recipient before creating a consignment.",
        },
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

    const token = await getAccessToken();
    if (!token.ok) return { ok: false, error: token.error };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${config.baseUrl}/aladdin/api/v1/merchant/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token.token}`,
        },
        body: JSON.stringify({
          store_id: Number(config.storeId),
          merchant_order_id: input.orderNumber,
          recipient_name: input.recipientName.trim().slice(0, 100),
          recipient_phone: phone,
          recipient_address: address,
          recipient_city: cityId,
          recipient_zone: zoneId,
          ...(areaId > 0 ? { recipient_area: areaId } : {}),
          delivery_type: Number(input.providerMeta?.deliveryType || 48),
          item_type: 2,
          item_quantity: 1,
          item_weight: Number(input.providerMeta?.itemWeight || process.env.PATHAO_ITEM_WEIGHT || "0.5"),
          amount_to_collect: Math.max(0, Math.round(Number(input.codAmount) || 0)),
          special_instruction: input.note ? input.note.slice(0, 200) : "",
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          error: classify(response.status, payload, `Pathao returned HTTP ${response.status}.`),
        };
      }

      const normalised = normalisePathaoCreate(payload);
      if (!normalised.consignmentId) {
        return {
          ok: false,
          error: {
            code: "upstream",
            message: "Pathao accepted the request but returned no consignment ID.",
          },
        };
      }

      return {
        ok: true,
        consignmentId: normalised.consignmentId,
        trackingCode: normalised.trackingCode,
        status: mapPathaoStatus(normalised.rawStatus),
        deliveryCharge: normalised.deliveryCharge,
        raw: normalised as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        error: {
          code: aborted ? "timeout" : "upstream",
          message: aborted ? "Pathao did not respond in time." : "Could not reach Pathao.",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async getStatus(input): Promise<ShipmentStatusResult> {
    const config = getPathaoConfig();
    if (!isPathaoConfigured()) {
      return {
        ok: false,
        error: { code: "not-configured", message: "Pathao credentials are not configured on the server." },
      };
    }

    const consignmentId = String(input.consignmentId || "").trim();
    if (!consignmentId) {
      return {
        ok: false,
        error: { code: "validation", message: "A Pathao consignment ID is required." },
      };
    }

    const token = await getAccessToken();
    if (!token.ok) return { ok: false, error: token.error };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(
        `${config.baseUrl}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token.token}`,
          },
          signal: controller.signal,
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          error: classify(response.status, payload, `Pathao returned HTTP ${response.status}.`),
        };
      }

      const rawStatus = readAny(payload, ["order_status", "status"]);
      return {
        ok: true,
        status: mapPathaoStatus(rawStatus),
        rawStatus: rawStatus || undefined,
        raw: isObject(payload) ? payload : undefined,
      };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        error: {
          code: aborted ? "timeout" : "upstream",
          message: aborted ? "Pathao did not respond in time." : "Could not reach Pathao.",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async getBalance(): Promise<CourierBalanceResult> {
    const config = getPathaoConfig();
    if (!isPathaoConfigured()) {
      return {
        ok: false,
        error: { code: "not-configured", message: "Pathao credentials are not configured on the server." },
      };
    }

    const token = await getAccessToken();
    if (!token.ok) return { ok: false, error: token.error };

    try {
      const response = await fetch(`${config.baseUrl}/aladdin/api/v1/merchant/balance`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token.token}` },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          error: classify(response.status, payload, "Pathao balance is unavailable."),
        };
      }
      for (const candidate of candidates(payload)) {
        const balance = readNumber(candidate, ["balance", "current_balance", "available_balance"]);
        if (balance !== null) return { ok: true, balance, currency: "BDT" };
      }
      return {
        ok: false,
        error: { code: "upstream", message: "Pathao returned no balance value." },
      };
    } catch {
      return {
        ok: false,
        error: { code: "upstream", message: "Could not reach Pathao." },
      };
    }
  },
};

export interface PathaoLocationItem {
  id: number;
  name: string;
}

const LOCATION_TTL_MS = 15 * 60 * 1000;
const locationCache = new Map<string, { items: PathaoLocationItem[]; expiresAt: number }>();

async function fetchPathaoLocations(
  cacheKey: string,
  path: string,
  idKeys: string[],
  nameKeys: string[]
): Promise<{ ok: true; items: PathaoLocationItem[] } | { ok: false; error: CourierError }> {
  const hit = locationCache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) {
    return { ok: true, items: hit.items };
  }
  const config = getPathaoConfig();
  if (!isPathaoConfigured()) {
    return {
      ok: false,
      error: { code: "not-configured", message: "Pathao credentials are not configured on the server." },
    };
  }
  const token = await getAccessToken();
  if (!token.ok) return { ok: false, error: token.error };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token.token}` },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        error: classify(response.status, payload, `Pathao returned HTTP ${response.status}.`),
      };
    }
    const rawRoot = isObject(payload) && isObject(payload.data) ? payload.data : payload;
    const rawList =
      isObject(rawRoot) && Array.isArray(rawRoot.data)
        ? rawRoot.data
        : isObject(payload) && Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
    const items: PathaoLocationItem[] = [];
    for (const row of rawList) {
      if (!isObject(row)) continue;
      const id = readNumber(row, idKeys);
      const name = readString(row, nameKeys);
      if (id !== null && name) items.push({ id, name });
    }
    locationCache.set(cacheKey, { items, expiresAt: Date.now() + LOCATION_TTL_MS });
    return { ok: true, items };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: {
        code: aborted ? "timeout" : "upstream",
        message: aborted ? "Pathao did not respond in time." : "Could not reach Pathao.",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function getPathaoCities() {
  return fetchPathaoLocations(
    "cities",
    "/aladdin/api/v1/city-list",
    ["city_id", "id"],
    ["city_name", "name"]
  );
}

export function getPathaoZones(cityId: number) {
  return fetchPathaoLocations(
    `zones:${cityId}`,
    `/aladdin/api/v1/cities/${encodeURIComponent(String(cityId))}/zone-list`,
    ["zone_id", "id"],
    ["zone_name", "name"]
  );
}

export function getPathaoAreas(zoneId: number) {
  return fetchPathaoLocations(
    `areas:${zoneId}`,
    `/aladdin/api/v1/zones/${encodeURIComponent(String(zoneId))}/area-list`,
    ["area_id", "id"],
    ["area_name", "name"]
  );
}
