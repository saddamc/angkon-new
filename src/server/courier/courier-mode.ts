/**
 * ANGKON — Courier Operating Mode & Safety Controls
 * 
 * Provides clear separation between MOCK/DEVELOPMENT mode and LIVE production mode.
 * 
 * Security Rules:
 * 1. Local development and automated testing MUST default to MOCK.
 * 2. Missing or incomplete environment configuration MUST fail safely.
 * 3. Production requires explicit live configuration:
 *      COURIER_MODE=live
 *      STEADFAST_LIVE_BOOKING_ENABLED=true
 * 4. Automated test runners must never create real courier bookings.
 * 5. Local test orders are blocked from accidental live booking.
 */

import { getAppEnvironment } from "../env/app-environment";

export type CourierMode = "mock" | "live";

export interface CourierModeConfig {
  mode: CourierMode;
  isLive: boolean;
  isMock: boolean;
  liveBookingEnabled: boolean;
  hasCredentials: boolean;
  reason?: string;
}

/**
 * Returns the effective courier operating mode and safety gates.
 */
export function getCourierModeConfig(): CourierModeConfig {
  const apiKey = (process.env.STEADFAST_API_KEY || "").trim();
  const secretKey = (process.env.STEADFAST_SECRET_KEY || "").trim();
  const hasCredentials = Boolean(apiKey && secretKey);

  const rawMode = (process.env.COURIER_MODE || "").trim().toLowerCase();
  const liveBookingEnabled = (process.env.STEADFAST_LIVE_BOOKING_ENABLED || "").trim().toLowerCase() === "true";

  // Automated test runners (node --test, vitest, jest) MUST default to mock unless explicitly testing adapter
  const isTestRunner = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST) || Boolean(process.env.JEST_WORKER_ID);

  // Strict Environment Isolation: Non-production environments MUST NEVER use live booking
  const appEnv = getAppEnvironment();
  if (appEnv !== "production" && !process.env.FORCE_LIVE_COURIER_TEST) {
    return {
      mode: "mock",
      isLive: false,
      isMock: true,
      liveBookingEnabled: false,
      hasCredentials,
      reason: `Non-production environment (${appEnv}). Mock courier mode strictly enforced for safety.`,
    };
  }

  if (rawMode === "live") {
    if (isTestRunner && !process.env.FORCE_LIVE_COURIER_TEST) {
      return {
        mode: "mock",
        isLive: false,
        isMock: true,
        liveBookingEnabled: false,
        hasCredentials,
        reason: "Automated test environment detected. Mock courier mode enforced for safety.",
      };
    }

    if (!liveBookingEnabled) {
      return {
        mode: "live",
        isLive: true,
        isMock: false,
        liveBookingEnabled: false,
        hasCredentials,
        reason: "COURIER_MODE is 'live' but STEADFAST_LIVE_BOOKING_ENABLED is not 'true'. Live booking is blocked.",
      };
    }

    if (!hasCredentials) {
      return {
        mode: "live",
        isLive: true,
        isMock: false,
        liveBookingEnabled: true,
        hasCredentials: false,
        reason: "COURIER_MODE is 'live' but Steadfast API credentials (STEADFAST_API_KEY / STEADFAST_SECRET_KEY) are missing.",
      };
    }

    return {
      mode: "live",
      isLive: true,
      isMock: false,
      liveBookingEnabled: true,
      hasCredentials: true,
    };
  }

  // Rule 1: Default for local development is MOCK
  return {
    mode: "mock",
    isLive: false,
    isMock: true,
    liveBookingEnabled: false,
    hasCredentials,
  };
}

/**
 * Detects whether an order is a local test order (to prevent accidental live booking).
 * Checks explicit order flags, order number prefixes, dummy phones, test emails, and test names.
 */
export function isLocalTestOrder(
  orderNumber: string,
  customer?: { phone?: string; email?: string; fullName?: string },
  orderDoc?: { isTestOrder?: boolean; isTest?: boolean }
): boolean {
  if (orderDoc?.isTestOrder === true || orderDoc?.isTest === true) {
    return true;
  }

  const num = (orderNumber || "").toUpperCase();
  if (
    num.startsWith("TEST") ||
    num.startsWith("MOCK") ||
    num.startsWith("DEV") ||
    num.startsWith("SANDBOX") ||
    num.startsWith("QA") ||
    num.includes("TEST") ||
    num.includes("MOCK") ||
    num.includes("SANDBOX") ||
    num.includes("QA-")
  ) {
    return true;
  }

  const phone = (customer?.phone || "").replace(/[^0-9]/g, "");
  // Dummy repeating phone numbers commonly used in testing
  if (
    phone === "01700000000" ||
    phone === "01800000000" ||
    phone === "01900000000" ||
    phone === "01300000000" ||
    phone === "01500000000" ||
    phone === "01600000000"
  ) {
    return true;
  }

  const email = (customer?.email || "").toLowerCase();
  if (
    email.includes("@test.") ||
    email.includes("@example.com") ||
    email.includes("sandbox") ||
    email.startsWith("test@") ||
    email.startsWith("mock@") ||
    email.startsWith("qa@") ||
    email.includes("qa-")
  ) {
    return true;
  }

  const name = (customer?.fullName || "").toLowerCase();
  if (
    name.includes("test customer") ||
    name.includes("qa customer") ||
    name.includes("qa test") ||
    name.includes("mock customer") ||
    name.includes("dummy") ||
    name.includes("sandbox") ||
    name.includes("synthetic")
  ) {
    return true;
  }

  return false;
}
