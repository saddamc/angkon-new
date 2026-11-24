import crypto from "crypto";
import { normalizeMetaContentId, normalizeMetaContentIds } from "@/lib/meta-product-id";
import { sanitizeClientIp } from "@/server/security/client-ip";
import type { MetaCapiUserData, MetaCapiEventPayload } from "./types";

/**
 * Computes standard SHA-256 hash for customer data parameter normalization.
 * Meta CAPI requires lowercased, trimmed strings before hashing.
 */
export function hashSha256(value?: string): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash("sha256").update(clean).digest("hex");
}

/**
 * Normalizes phone numbers according to E.164 / Meta recommendation.
 * Automatically handles Bangladesh mobile numbers (e.g. 0171... -> 880171...).
 */
export function normalizeAndHashPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  // Strip all non-numeric characters
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;

  // If local Bangladesh number starting with 01 (11 digits), prepend country code 880
  if (digits.startsWith("01") && digits.length === 11) {
    digits = `880${digits.slice(1)}`;
  } else if (digits.startsWith("1") && digits.length === 10) {
    digits = `880${digits}`;
  }

  return crypto.createHash("sha256").update(digits).digest("hex");
}

/**
 * Builds standard Meta Conversions API user_data object.
 * Strictly hashes PII (email, phone, name, city, zip, country) while
 * preserving IP address, User-Agent, and cookies in plaintext per Meta spec.
 */
export function buildMetaUserData(userData?: MetaCapiUserData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!userData) return result;

  const hashedEmail = hashSha256(userData.email);
  if (hashedEmail) result.em = [hashedEmail];

  const hashedPhone = normalizeAndHashPhone(userData.phone);
  if (hashedPhone) result.ph = [hashedPhone];

  let firstName = userData.firstName?.trim();
  let lastName = userData.lastName?.trim();

  // If firstName contains spaces and lastName is empty, split full name into first and last name
  if (firstName && !lastName && firstName.includes(" ")) {
    const nameParts = firstName.split(/\s+/);
    firstName = nameParts[0];
    lastName = nameParts.slice(1).join(" ");
  }

  const hashedFn = hashSha256(firstName);
  if (hashedFn) result.fn = [hashedFn];

  const hashedLn = hashSha256(lastName);
  if (hashedLn) result.ln = [hashedLn];

  const city = userData.city || userData.district;
  const hashedCity = hashSha256(city);
  if (hashedCity) result.ct = [hashedCity];

  const country = userData.country || "bd";
  const hashedCountry = hashSha256(country);
  if (hashedCountry) result.country = [hashedCountry];

  const hashedZp = hashSha256(userData.postalCode);
  if (hashedZp) result.zp = [hashedZp];

  // IP, User-Agent, and Cookies MUST remain plaintext (never hashed)
  const validIp = sanitizeClientIp(userData.clientIp);
  if (validIp) {
    result.client_ip_address = validIp;
  }

  // Meta Conversions API Diagnostic Rule:
  // "Your server is sending a user agent parameter but it isn't sending an IP address parameter for one or more events.
  //  User agent and IP address must be sent together, otherwise your user agent data may not be useful."
  // If client_ip_address cannot be resolved (or is invalid/loopback), client_user_agent must NOT be sent alone.
  if (userData.clientUserAgent && result.client_ip_address) {
    result.client_user_agent = userData.clientUserAgent;
  }
  if (userData.fbp) {
    result.fbp = userData.fbp;
  }
  if (userData.fbc) {
    result.fbc = userData.fbc;
  }

  return result;
}

/**
 * Creates safe, sanitized parameters for persistence in MetaEventLog.
 * Never stores raw credentials, raw emails, raw phone numbers, or complete card details.
 */
export function sanitizeEventParameters(event: MetaCapiEventPayload): Record<string, unknown> {
  const params: Record<string, unknown> = {
    eventId: event.eventId,
    actionSource: event.actionSource || "website",
    hasEmail: Boolean(event.userData?.email),
    hasPhone: Boolean(event.userData?.phone),
    hasFbp: Boolean(event.userData?.fbp),
    hasFbc: Boolean(event.userData?.fbc),
  };

  // Standard PageView is non-monetary and must not store currency or value in ledger parameters
  if (event.eventName === "PageView") {
    return params;
  }

  if (event.customData) {
    if (event.customData.value !== undefined) params.value = event.customData.value;
    if (event.customData.currency) params.currency = event.customData.currency;
    if (event.customData.order_id) params.order_id = event.customData.order_id;
    if (event.customData.num_items !== undefined) params.num_items = event.customData.num_items;
    if (event.customData.content_type) params.content_type = event.customData.content_type;
    if (event.customData.content_name) params.content_name = event.customData.content_name;
    if (Array.isArray(event.customData.content_ids)) {
      params.content_ids = normalizeMetaContentIds(event.customData.content_ids).slice(0, 10);
    }
    if (Array.isArray(event.customData.contents)) {
      params.contents = event.customData.contents.slice(0, 20).map((c) => ({
        id: normalizeMetaContentId(c.id) ?? String(c.id || ""),
        quantity: typeof c.quantity === "number" ? c.quantity : 1,
        ...(typeof c.item_price === "number" ? { item_price: c.item_price } : {}),
      }));
    }
  }

  return params;
}
