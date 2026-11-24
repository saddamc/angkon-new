import crypto from "crypto";

/**
 * Generates a collision-resistant deterministic or pseudo-random event ID
 * used for pairing browser pixel events and server Conversions API (CAPI) events.
 */
export function generateEventId(prefix = "evt"): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(6).toString("hex");
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Validates that an event ID conforms to Meta CAPI recommended format
 * (non-empty, alphanumeric with underscores/hyphens, max 64 chars).
 */
export function isValidEventId(eventId?: string | null): boolean {
  if (!eventId || typeof eventId !== "string") return false;
  const trimmed = eventId.trim();
  return /^[A-Za-z0-9_-]{4,64}$/.test(trimmed);
}

/**
 * Builds a deterministic idempotency/deduplication key for a customer action
 * (e.g. order checkout or cart action) to avoid double server transmission.
 */
export function buildActionDeduplicationKey(
  action: string,
  identifier: string,
  tenantId = "angkon-main"
): string {
  return `${tenantId}:${action.toLowerCase()}:${identifier.trim().toLowerCase()}`;
}
