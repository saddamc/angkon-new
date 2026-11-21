import type { NextRequest } from "next/server";

/**
 * Idempotency keys for checkout submissions.
 *
 * A double-click, a browser retry or a client-side network retry must not
 * create a second order, a second gateway session or a second Purchase event.
 * The client sends `Idempotency-Key`; the server stores it on the order with a
 * unique sparse index and replays the original response for duplicates.
 */

export const IDEMPOTENCY_KEY_MIN_LENGTH = 8;
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

export function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length < IDEMPOTENCY_KEY_MIN_LENGTH) return null;
  if (value.length > IDEMPOTENCY_KEY_MAX_LENGTH) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) return null;
  return value;
}

export function readIdempotencyKey(request: NextRequest): string | null {
  return normalizeIdempotencyKey(
    request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key")
  );
}
