import { getJwtSecret } from "@/lib/env";
import {
  createReturnToken,
  verifyReturnToken,
  RETURN_TOKEN_TTL_MS,
} from "./return-token-core";

/**
 * Signed return-URL token.
 *
 * The return URL is a browser redirect and can be forged. This token is not the
 * payment proof (the SSLCOMMERZ `val_id` validator is), but it binds the return
 * to the order that started the session and rejects cross-order redirects
 * before any database work.
 */

export { RETURN_TOKEN_TTL_MS };

export function createPaymentReturnToken(orderNumber: string, now = Date.now()): string {
  return createReturnToken(orderNumber, getJwtSecret(), now);
}

export function verifyPaymentReturnToken(
  token: string | null | undefined,
  expectedOrderNumber: string,
  now = Date.now()
): boolean {
  return verifyReturnToken(token, expectedOrderNumber, getJwtSecret(), now, RETURN_TOKEN_TTL_MS);
}
