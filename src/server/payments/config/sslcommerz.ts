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

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i;

/**
 * Resolves the canonical server-side base URL for SSLCOMMERZ customer callbacks.
 *
 * Security & Environment Rules:
 * - Never constructs URLs from untrusted request `Host` or `x-forwarded-host` headers.
 * - Production always uses `https://angkon.net` (or an explicit HTTPS non-localhost env URL).
 * - Staging uses the configured public HTTPS staging domain.
 * - Local development falls back to `http://localhost:3000`.
 */
export function getPaymentCallbackBaseUrl(envOverride?: AppEnvironment): string {
  const appEnv = envOverride || getAppEnvironment();
  const raw =
    process.env.PAYMENT_CALLBACK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "";

  if (appEnv === "production") {
    const prodUrl = (raw || "https://angkon.net").replace(/\/+$/, "");
    if (LOCALHOST_PATTERN.test(prodUrl) || !prodUrl.startsWith("https://")) {
      throw new Error(
        `Invalid production payment callback base URL "${prodUrl}". Production must use a public HTTPS domain (e.g. https://angkon.net).`
      );
    }
    return prodUrl;
  }

  if (raw) {
    const clean = raw.replace(/\/+$/, "");
    if (appEnv === "preview" && (LOCALHOST_PATTERN.test(clean) || !clean.startsWith("https://"))) {
      throw new Error(
        `Invalid staging payment callback base URL "${clean}". Staging must use a public HTTPS domain.`
      );
    }
    return clean;
  }

  if (appEnv === "preview") {
    throw new Error(
      "Staging payment callback base URL is not configured. Set NEXT_PUBLIC_SITE_URL to your public HTTPS staging domain."
    );
  }

  return "http://localhost:3000";
}

/**
 * Resolves the server-side base URL for the SSLCOMMERZ server-to-server IPN listener.
 *
 * Production and staging must never use `localhost` for an IPN endpoint.
 */
export function getPaymentIpnBaseUrl(envOverride?: AppEnvironment): string {
  const appEnv = envOverride || getAppEnvironment();
  const explicitIpn = process.env.PAYMENT_IPN_BASE_URL?.trim().replace(/\/+$/, "");
  const base = explicitIpn || getPaymentCallbackBaseUrl(appEnv);

  if ((appEnv === "production" || appEnv === "preview") && LOCALHOST_PATTERN.test(base)) {
    throw new Error(
      `Invalid IPN base URL "${base}" for ${appEnv}. Never use localhost for an externally accessible IPN endpoint.`
    );
  }

  return base;
}
