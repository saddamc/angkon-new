import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDatabaseConnection,
  SUPPORTED_APPLICATION_DATABASES,
  ALL_SUPPORTED_DATABASES,
  parseMongoUri,
  getAppEnvironment,
} from "../src/server/env/app-environment";
import {
  getSslcommerzCredentials,
  isSslcommerzLive,
  isSslcommerzLiveReady,
  isOnlinePaymentAvailableForEnvironment,
} from "../src/server/payments/config/sslcommerz";
import {
  getCourierModeConfig,
  isLocalTestOrder,
} from "../src/server/courier/core/courier-mode";
import { getDatabaseDiagnostics } from "../src/lib/mongodb";

/**
 * Helper to safely set or delete environment variables without leaving "undefined" strings
 */
function setEnv(key: string, value?: string) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

/**
 * ANGKON — Manual Configuration & Isolation Matrix Tests
 *
 * Verifies direct, decoupled manual control over:
 * 1. MongoDB Database Selection (angkon_dev / angkon)
 * 2. SSLCOMMERZ Payment Mode (sandbox / live)
 * 3. Courier Logistics Mode (mock / live)
 *
 * Ensures:
 * - Changing database NEVER automatically alters payment or courier modes.
 * - Non-production is blocked from production database 'angkon' unless explicitly authorized.
 * - Production requires 'angkon' and rejects 'angkon_dev'.
 * - Diagnostics report active database, payment mode, and courier mode with zero leaked credentials.
 */

test("Manual DB Selection: Supported application databases are angkon_dev and angkon", () => {
  assert.deepEqual(SUPPORTED_APPLICATION_DATABASES, ["angkon_dev", "angkon"]);
  assert.ok(ALL_SUPPORTED_DATABASES.includes("angkon_dev"));
  assert.ok(ALL_SUPPORTED_DATABASES.includes("angkon"));
  assert.ok(ALL_SUPPORTED_DATABASES.includes("angkon_test"));
});

test("Manual DB Selection: Unsupported database names are rejected immediately", () => {
  const invalidUri = "mongodb+srv://admin:pass@cluster.mongodb.net/random_db?retryWrites=true";
  const res = validateDatabaseConnection(invalidUri, "development");
  assert.equal(res.valid, false);
  assert.match(res.error || "", /UNSUPPORTED_DATABASE/);
  assert.match(res.error || "", /random_db/);
});

test("Permitted Combination 1: Development DB + Sandbox Payment + Mock Courier", () => {
  const devUri = "mongodb+srv://user:pass@cluster.mongodb.net/angkon_dev?retryWrites=true";
  const dbValidation = validateDatabaseConnection(devUri, "development");

  assert.equal(dbValidation.valid, true);
  assert.equal(dbValidation.actualDatabase, "angkon_dev");
  assert.equal(dbValidation.isProductionDatabase, false);
  assert.equal(dbValidation.productionWarning, null);

  const prevMode = process.env.SSLCOMMERZ_MODE;
  const prevLive = process.env.SSLCOMMERZ_IS_LIVE;
  const prevCourier = process.env.COURIER_MODE;

  try {
    setEnv("SSLCOMMERZ_MODE", "sandbox");
    setEnv("SSLCOMMERZ_IS_LIVE", "false");
    setEnv("COURIER_MODE", "mock");

    const paymentCreds = getSslcommerzCredentials();
    assert.equal(paymentCreds.mode, "sandbox");
    assert.equal(isSslcommerzLive(), false);

    const courierConfig = getCourierModeConfig();
    assert.equal(courierConfig.mode, "mock");
    assert.equal(courierConfig.isMock, true);
    assert.equal(courierConfig.liveBookingEnabled, false);
  } finally {
    setEnv("SSLCOMMERZ_MODE", prevMode);
    setEnv("SSLCOMMERZ_IS_LIVE", prevLive);
    setEnv("COURIER_MODE", prevCourier);
  }
});

test("Permitted Combination 2: Development DB + Sandbox Payment + Explicitly Authorized Live Courier Test", () => {
  const devUri = "mongodb+srv://user:pass@cluster.mongodb.net/angkon_dev?retryWrites=true";
  const dbValidation = validateDatabaseConnection(devUri, "development");
  assert.equal(dbValidation.valid, true);

  const prevCourier = process.env.COURIER_MODE;
  const prevLiveBooking = process.env.STEADFAST_LIVE_BOOKING_ENABLED;
  const prevForceLive = process.env.FORCE_LIVE_COURIER_TEST;
  const prevApiKey = process.env.STEADFAST_API_KEY;
  const prevSecretKey = process.env.STEADFAST_SECRET_KEY;

  try {
    setEnv("COURIER_MODE", "live");
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", "true");
    setEnv("FORCE_LIVE_COURIER_TEST", "true");
    setEnv("STEADFAST_API_KEY", "test_live_key");
    setEnv("STEADFAST_SECRET_KEY", "test_live_secret");

    const courierConfig = getCourierModeConfig();
    assert.equal(courierConfig.mode, "live");
    assert.equal(courierConfig.isLive, true);
    assert.equal(courierConfig.liveBookingEnabled, true);
    assert.equal(courierConfig.hasCredentials, true);
  } finally {
    setEnv("COURIER_MODE", prevCourier);
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", prevLiveBooking);
    setEnv("FORCE_LIVE_COURIER_TEST", prevForceLive);
    setEnv("STEADFAST_API_KEY", prevApiKey);
    setEnv("STEADFAST_SECRET_KEY", prevSecretKey);
  }
});

test("Permitted Combination 3: Production DB + Live Payment + Live Courier (in production environment)", () => {
  const prodUri = "mongodb+srv://user:secret@cluster.mongodb.net/angkon?retryWrites=true";
  const dbValidation = validateDatabaseConnection(prodUri, "production");

  assert.equal(dbValidation.valid, true);
  assert.equal(dbValidation.actualDatabase, "angkon");
  assert.equal(dbValidation.isProductionDatabase, true);
  assert.ok(dbValidation.productionWarning?.includes("ACTIVE DATABASE IS PRODUCTION: 'angkon'"));

  const prevEnv = process.env.APP_ENVIRONMENT;
  const prevMode = process.env.SSLCOMMERZ_MODE;
  const prevLive = process.env.SSLCOMMERZ_IS_LIVE;
  const prevLiveId = process.env.SSLCOMMERZ_LIVE_STORE_ID;
  const prevLivePass = process.env.SSLCOMMERZ_LIVE_STORE_PASSWORD;
  const prevCourier = process.env.COURIER_MODE;
  const prevLiveBooking = process.env.STEADFAST_LIVE_BOOKING_ENABLED;
  const prevApiKey = process.env.STEADFAST_API_KEY;
  const prevSecretKey = process.env.STEADFAST_SECRET_KEY;

  try {
    setEnv("APP_ENVIRONMENT", "production");
    setEnv("SSLCOMMERZ_MODE", "live");
    setEnv("SSLCOMMERZ_IS_LIVE", "true");
    setEnv("SSLCOMMERZ_LIVE_STORE_ID", "angkon_live_official");
    setEnv("SSLCOMMERZ_LIVE_STORE_PASSWORD", "live_secret_token");
    setEnv("COURIER_MODE", "live");
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", "true");
    setEnv("STEADFAST_API_KEY", "real_steadfast_key");
    setEnv("STEADFAST_SECRET_KEY", "real_steadfast_secret");

    const paymentCreds = getSslcommerzCredentials();
    assert.equal(paymentCreds.mode, "live");
    assert.equal(isSslcommerzLive(), true);
    assert.equal(isSslcommerzLiveReady(paymentCreds), true);
    assert.equal(isOnlinePaymentAvailableForEnvironment("production", paymentCreds), true);

    const courierConfig = getCourierModeConfig();
    assert.equal(courierConfig.mode, "live");
    assert.equal(courierConfig.isLive, true);
    assert.equal(courierConfig.liveBookingEnabled, true);
  } finally {
    setEnv("APP_ENVIRONMENT", prevEnv);
    setEnv("SSLCOMMERZ_MODE", prevMode);
    setEnv("SSLCOMMERZ_IS_LIVE", prevLive);
    setEnv("SSLCOMMERZ_LIVE_STORE_ID", prevLiveId);
    setEnv("SSLCOMMERZ_LIVE_STORE_PASSWORD", prevLivePass);
    setEnv("COURIER_MODE", prevCourier);
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", prevLiveBooking);
    setEnv("STEADFAST_API_KEY", prevApiKey);
    setEnv("STEADFAST_SECRET_KEY", prevSecretKey);
  }
});

test("Permitted Combination 4: Development DB + Live Payment (Decoupled manual live test on dev DB)", () => {
  const devUri = "mongodb+srv://user:pass@cluster.mongodb.net/angkon_dev?retryWrites=true";
  const dbValidation = validateDatabaseConnection(devUri, "development");
  assert.equal(dbValidation.valid, true);

  const prevMode = process.env.SSLCOMMERZ_MODE;
  const prevLive = process.env.SSLCOMMERZ_IS_LIVE;
  const prevLiveId = process.env.SSLCOMMERZ_LIVE_STORE_ID;
  const prevLivePass = process.env.SSLCOMMERZ_LIVE_STORE_PASSWORD;

  try {
    setEnv("SSLCOMMERZ_MODE", "live");
    setEnv("SSLCOMMERZ_IS_LIVE", "true");
    setEnv("SSLCOMMERZ_LIVE_STORE_ID", "angkon_live_test");
    setEnv("SSLCOMMERZ_LIVE_STORE_PASSWORD", "live_test_password");

    const paymentCreds = getSslcommerzCredentials();
    assert.equal(paymentCreds.mode, "live");
    assert.equal(isSslcommerzLive(), true);
    assert.equal(isOnlinePaymentAvailableForEnvironment("development", paymentCreds), true);
  } finally {
    setEnv("SSLCOMMERZ_MODE", prevMode);
    setEnv("SSLCOMMERZ_IS_LIVE", prevLive);
    setEnv("SSLCOMMERZ_LIVE_STORE_ID", prevLiveId);
    setEnv("SSLCOMMERZ_LIVE_STORE_PASSWORD", prevLivePass);
  }
});

test("Permitted Combination 5: Production DB + Mock Courier (Decoupled mock courier with production DB)", () => {
  const prodUri = "mongodb+srv://user:secret@cluster.mongodb.net/angkon?retryWrites=true";
  const dbValidation = validateDatabaseConnection(prodUri, "production");
  assert.equal(dbValidation.valid, true);

  const prevCourier = process.env.COURIER_MODE;
  const prevLiveBooking = process.env.STEADFAST_LIVE_BOOKING_ENABLED;

  try {
    setEnv("COURIER_MODE", "mock");
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", "false");

    const courierConfig = getCourierModeConfig();
    assert.equal(courierConfig.mode, "mock");
    assert.equal(courierConfig.isMock, true);
    assert.equal(courierConfig.liveBookingEnabled, false);
  } finally {
    setEnv("COURIER_MODE", prevCourier);
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", prevLiveBooking);
  }
});

test("Safety Rejection: Non-production connecting to 'angkon' is rejected without explicit authorization", () => {
  const prodUri = "mongodb+srv://user:secret@cluster.mongodb.net/angkon?retryWrites=true";
  const prevAllow = process.env.ALLOW_PRODUCTION_DB_ACCESS;

  try {
    delete process.env.ALLOW_PRODUCTION_DB_ACCESS;
    const res = validateDatabaseConnection(prodUri, "development");
    assert.equal(res.valid, false);
    assert.match(res.error || "", /CRITICAL ISOLATION VIOLATION/);
  } finally {
    setEnv("ALLOW_PRODUCTION_DB_ACCESS", prevAllow);
  }
});

test("Safety Bypass: Non-production connecting to 'angkon' with ALLOW_PRODUCTION_DB_ACCESS=true succeeds with warning", () => {
  const prodUri = "mongodb+srv://user:secret@cluster.mongodb.net/angkon?retryWrites=true";
  const prevAllow = process.env.ALLOW_PRODUCTION_DB_ACCESS;

  try {
    setEnv("ALLOW_PRODUCTION_DB_ACCESS", "true");
    const res = validateDatabaseConnection(prodUri, "development");
    assert.equal(res.valid, true);
    assert.equal(res.actualDatabase, "angkon");
    assert.equal(res.isProductionDatabase, true);
    assert.ok(res.productionWarning?.includes("ALLOW_PRODUCTION_DB_ACCESS=true"));
  } finally {
    setEnv("ALLOW_PRODUCTION_DB_ACCESS", prevAllow);
  }
});

test("Safety Rejection: Production connecting to non-angkon database is strictly rejected", () => {
  const devUri = "mongodb+srv://user:pass@cluster.mongodb.net/angkon_dev?retryWrites=true";
  const res = validateDatabaseConnection(devUri, "production");
  assert.equal(res.valid, false);
  assert.match(res.error || "", /CRITICAL PRODUCTION CONFIGURATION ERROR/);
});

test("Safety Rejection: Live payment mode with sandbox store ID (testbox) is rejected", () => {
  const invalidCreds = {
    mode: "live" as const,
    storeId: "testbox_fashion123",
    storePassword: "dummy_password",
    configured: true,
  };
  assert.equal(isSslcommerzLiveReady(invalidCreds), false);
  assert.equal(isOnlinePaymentAvailableForEnvironment("production", invalidCreds), false);
});

test("Safety Rejection: Non-production live courier is downgraded to mock without FORCE_LIVE_COURIER_TEST", () => {
  const prevEnv = process.env.APP_ENVIRONMENT;
  const prevCourier = process.env.COURIER_MODE;
  const prevLiveBooking = process.env.STEADFAST_LIVE_BOOKING_ENABLED;
  const prevForceLive = process.env.FORCE_LIVE_COURIER_TEST;

  try {
    setEnv("APP_ENVIRONMENT", "development");
    setEnv("COURIER_MODE", "live");
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", "true");
    setEnv("FORCE_LIVE_COURIER_TEST", "false");

    const courierConfig = getCourierModeConfig();
    assert.equal(courierConfig.mode, "mock");
    assert.equal(courierConfig.isMock, true);
    assert.equal(courierConfig.liveBookingEnabled, false);
    assert.ok(courierConfig.reason?.includes("Non-production environment"));
  } finally {
    setEnv("APP_ENVIRONMENT", prevEnv);
    setEnv("COURIER_MODE", prevCourier);
    setEnv("STEADFAST_LIVE_BOOKING_ENABLED", prevLiveBooking);
    setEnv("FORCE_LIVE_COURIER_TEST", prevForceLive);
  }
});

test("Safety Rejection: Local test orders are identified and blocked from live booking", () => {
  assert.equal(isLocalTestOrder("ANG-TEST-99999"), true);
  assert.equal(isLocalTestOrder("ANG-123456", { phone: "01700000000" }), true);
  assert.equal(isLocalTestOrder("ANG-123456", { email: "test@example.com" }), true);
  assert.equal(isLocalTestOrder("ANG-123456", { fullName: "Test Customer" }), true);
  assert.equal(isLocalTestOrder("ANG-123456", { name: "Test Customer" }), true);
  assert.equal(isLocalTestOrder("ANG-847291-382", { name: "Sadman Rahman", phone: "01712345678" }), false);
});

test("Diagnostics Snapshot: getDatabaseDiagnostics exposes active database, payment, and courier without secrets", () => {
  const prevDbUrl = process.env.DATABASE_URL;
  try {
    setEnv("DATABASE_URL", "mongodb+srv://admin_user:secret_password@cluster0.abcde.mongodb.net/angkon_dev?retryWrites=true");
    const diag = getDatabaseDiagnostics();

    // Database snapshot
    assert.ok(diag.database);
    assert.equal(diag.database.activeDatabase, "angkon_dev");
    assert.equal(diag.database.isProductionDatabase, false);
    assert.equal(diag.database.productionWarning, null);
    assert.ok(diag.database.sanitizedHost);
    assert.equal(diag.database.sanitizedHost.includes("secret_password"), false, "Credentials must never leak in sanitized host");
    assert.equal(diag.database.sanitizedHost.includes("@"), false, "Credentials must never leak in sanitized host");

    // Payment snapshot
    assert.ok(diag.payment);
    assert.ok(["sandbox", "live"].includes(diag.payment.mode));
    assert.ok(typeof diag.payment.isLive === "boolean");
    assert.ok(typeof diag.payment.isLiveReady === "boolean");
    assert.ok(typeof diag.payment.configured === "boolean");
    assert.ok(typeof diag.payment.storeIdMasked === "string");
    assert.equal("storePassword" in diag.payment, false, "Payment password must NEVER be exposed in diagnostics");

    // Courier snapshot
    assert.ok(diag.courier);
    assert.ok(["mock", "live"].includes(diag.courier.mode));
    assert.ok(typeof diag.courier.isLive === "boolean");
    assert.ok(typeof diag.courier.isMock === "boolean");
    assert.ok(typeof diag.courier.liveBookingEnabled === "boolean");
    assert.equal("apiKey" in diag.courier, false, "Courier API key must NEVER be exposed in diagnostics");
    assert.equal("secretKey" in diag.courier, false, "Courier secret key must NEVER be exposed in diagnostics");
  } finally {
    setEnv("DATABASE_URL", prevDbUrl);
  }
});
