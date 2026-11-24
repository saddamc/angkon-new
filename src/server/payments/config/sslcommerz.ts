/**
 * ANGKON – SSLCOMMERZ shared merchant configuration & safety engine.
 *
 * The actual gateway client lives in `src/server/payments/providers/sslcommerz/`.
 * This module exposes credential selection, live readiness checks, environment
 * validation, and signed tracking token helpers.
 */

import { getJwtSecret } from "@/lib/env";
import { getAppEnvironment, type AppEnvironment } from "@/server/env/app-environment";
import {
  createTrackingToken,
  verifyTrackingToken,
} from "../tracking-token-core";

export function createPaymentTrackingToken(orderNumber: string, total: number): string {
  return createTrackingToken(orderNumber, total, getJwtSecret());
}

export function verifyPaymentTrackingToken(token: string, expectedOrderNumber: string): boolean {
  return verifyTrackingToken(token, expectedOrderNumber, getJwtSecret());
}

export interface SslcommerzCredentials {
  mode: "sandbox" | "live";
  storeId: string;
  storePassword: string;
  configured: boolean;
}

/**
 * Sandbox and live must never share a store. The scoped pair wins when set:
 *
 *   live    → SSLCOMMERZ_LIVE_STORE_ID / SSLCOMMERZ_LIVE_STORE_PASSWORD
 *   sandbox → SSLCOMMERZ_SANDBOX_STORE_ID / SSLCOMMERZ_SANDBOX_STORE_PASSWORD
 *
 * The legacy `SSLCOMMERZ_STORE_ID` / `SSLCOMMERZ_STORE_PASSWORD` pair is kept
 * as a fallback so existing deployments keep working.
 */
export function getSslcommerzCredentials(): SslcommerzCredentials {
  const live =
    process.env.SSLCOMMERZ_IS_LIVE?.trim().toLowerCase() === "true" ||
    process.env.SSLCOMMERZ_MODE?.trim().toLowerCase() === "live";

  const scopedId = live
    ? process.env.SSLCOMMERZ_LIVE_STORE_ID?.trim()
    : process.env.SSLCOMMERZ_SANDBOX_STORE_ID?.trim();
  const scopedPassword = live
    ? process.env.SSLCOMMERZ_LIVE_STORE_PASSWORD?.trim()
    : process.env.SSLCOMMERZ_SANDBOX_STORE_PASSWORD?.trim();

  const storeId = scopedId || process.env.SSLCOMMERZ_STORE_ID?.trim() || "";
  const storePassword =
    scopedPassword || process.env.SSLCOMMERZ_STORE_PASSWORD?.trim() || "";

  return {
    mode: live ? "live" : "sandbox",
    storeId,
    storePassword,
    configured: Boolean(storeId && storePassword),
  };
}

export function isSslcommerzConfigured(): boolean {
  return getSslcommerzCredentials().configured;
}

export function isSslcommerzLive(): boolean {
  return getSslcommerzCredentials().mode === "live";
}

/**
 * Validates whether SSLCOMMERZ is strictly live-ready for real payments:
 * 1. Must be in live mode (SSLCOMMERZ_IS_LIVE=true or SSLCOMMERZ_MODE=live).
 * 2. Dedicated store credentials must be configured.
 * 3. Store ID must not be a sandbox test ID (no "testbox", "sandbox", or "test" prefixes).
 */
export function isSslcommerzLiveReady(customCreds?: Partial<SslcommerzCredentials>): boolean {
  const creds = customCreds
    ? {
        mode: customCreds.mode || "sandbox",
        storeId: customCreds.storeId || "",
        storePassword: customCreds.storePassword || "",
        configured: Boolean(customCreds.storeId && customCreds.storePassword),
      }
    : getSslcommerzCredentials();
  if (creds.mode !== "live") return false;
  if (!creds.configured) return false;

  const id = creds.storeId.toLowerCase();
  if (id.includes("testbox") || id.includes("sandbox") || id.startsWith("test")) {
    return false;
  }
  return true;
}

/**
 * Determines whether online payment should be offered at checkout for the given environment.
 *
 * In Production:
 * - MUST return false unless dedicated Live credentials and explicit Live mode are configured.
 * - Sandbox credentials or sandbox mode in production MUST return false.
 *
 * In Development & Preview:
 * - Returns true if gateway credentials (sandbox or live) are configured.
 */
export function isOnlinePaymentAvailableForEnvironment(
  env?: AppEnvironment,
  customCreds?: Partial<SslcommerzCredentials>
): boolean {
  const appEnv = env || getAppEnvironment();
  const creds = customCreds
    ? {
        mode: customCreds.mode || "sandbox",
        storeId: customCreds.storeId || "",
        storePassword: customCreds.storePassword || "",
        configured: Boolean(customCreds.storeId && customCreds.storePassword),
      }
    : getSslcommerzCredentials();

  if (!creds.configured) return false;

  if (appEnv === "production") {
    return isSslcommerzLiveReady(creds);
  }

  return creds.configured;
}
