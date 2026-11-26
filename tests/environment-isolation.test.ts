import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * ANGKON — Environment Isolation & Safety Containment Unit Tests
 *
 * Verifies strict environment isolation across:
 * 1. Environment resolution & mapping rules
 * 2. MongoDB connection gating & cross-environment rejection
 * 3. Payment gateway safety & Sandbox containment in Production
 * 4. Courier mock-mode enforcement in non-production
 * 5. Side-effect containment (Resend emails, Cloudinary, Meta CAPI)
 */

const appEnvModule = fs.readFileSync("src/server/env/app-environment.ts", "utf8");
const mongodbModule = fs.readFileSync("src/lib/mongodb.ts", "utf8");
const sslcommerzModule = fs.readFileSync(
  fs.existsSync("src/server/payments/config/sslcommerz.ts")
    ? "src/server/payments/config/sslcommerz.ts"
    : "src/server/sslcommerz.ts",
  "utf8"
);
const courierModeModule = fs.readFileSync((fs.existsSync("src/server/courier/core/courier-mode.ts") ? "src/server/courier/core/courier-mode.ts" : "src/server/courier/courier-mode.ts"), "utf8");
const initiatePaymentService = fs.readFileSync("src/server/payments/services/initiate-payment.ts", "utf8");
const verifyPaymentService = fs.readFileSync("src/server/payments/services/verify-payment.ts", "utf8");
const emailModule = fs.readFileSync("src/lib/email/resend.ts", "utf8");
const cloudinaryModule = fs.readFileSync("src/lib/cloudinary.ts", "utf8");
const metaCapiModule = fs.readFileSync(
  fs.existsSync("src/server/meta/capi/meta-capi.ts")
    ? "src/server/meta/capi/meta-capi.ts"
    : "src/server/meta-capi.ts",
  "utf8"
);

test("environment isolation: explicit APP_ENVIRONMENT and database mappings", async () => {
  const {
    ENVIRONMENT_DATABASE_MAP,
    parseMongoUri,
    validateDatabaseConnection,
  } = await import("../src/server/env/app-environment.ts");

  assert.equal(ENVIRONMENT_DATABASE_MAP.production, "angkon");
  assert.equal(ENVIRONMENT_DATABASE_MAP.development, "angkon_dev");
  assert.equal(ENVIRONMENT_DATABASE_MAP.preview, "angkon_preview");
  assert.equal(ENVIRONMENT_DATABASE_MAP.test, "angkon_test");

  // Valid URI parsing
  const parsed = parseMongoUri("mongodb+srv://user:pass@cluster0.sdaudkh.mongodb.net/angkon_dev?retryWrites=true");
  assert.equal(parsed.databaseName, "angkon_dev");
  assert.equal(parsed.host, "cluster0.sdaudkh.mongodb.net");
  assert.equal(parsed.sanitizedUri.includes("pass"), false);
});

test("environment isolation: non-production connecting to 'angkon' succeeds with security warning and never leaks credentials", async () => {
  const { validateDatabaseConnection } = await import("../src/server/env/app-environment.ts");

  const prodUri = "mongodb+srv://user:secret@cluster0.sdaudkh.mongodb.net/angkon?retryWrites=true";

  for (const env of ["development", "preview", "test"] as const) {
    const res = validateDatabaseConnection(prodUri, env);
    assert.equal(res.valid, true);
    assert.equal(res.actualDatabase, "angkon");
    assert.equal(res.isProductionDatabase, true);
    assert.match(res.productionWarning || "", /ACTIVE DATABASE IS PRODUCTION/);
    assert.equal((res.sanitizedHost || "").includes("secret"), false, "Credentials must never leak");
  }
});

test("environment isolation: production allows any database configured in DATABASE_URL", async () => {
  const { validateDatabaseConnection } = await import("../src/server/env/app-environment.ts");

  const devUri = "mongodb+srv://user:secret@cluster0.sdaudkh.mongodb.net/angkon_dev?retryWrites=true";
  const devRes = validateDatabaseConnection(devUri, "production");
  assert.equal(devRes.valid, true);
  assert.equal(devRes.actualDatabase, "angkon_dev");
  assert.equal(devRes.isProductionDatabase, false);
  assert.match(devRes.productionWarning || "", /manually configured via DATABASE_URL/);

  const customUri = "mongodb+srv://user:secret@cluster0.sdaudkh.mongodb.net/angkon_v2_custom?retryWrites=true";
  const customRes = validateDatabaseConnection(customUri, "production");
  assert.equal(customRes.valid, true);
  assert.equal(customRes.actualDatabase, "angkon_v2_custom");
});

test("environment isolation: conflicting connection variables are rejected", async () => {
  const { validateDatabaseConnection } = await import("../src/server/env/app-environment.ts");

  const origUrl = process.env.DATABASE_URL;
  const origMongo = process.env.MONGODB_URI;

  try {
    process.env.DATABASE_URL = "mongodb+srv://user:pass@cluster0.sdaudkh.mongodb.net/angkon_dev";
    process.env.MONGODB_URI = "mongodb+srv://user:pass@cluster0.sdaudkh.mongodb.net/angkon_test";

    const res = validateDatabaseConnection(undefined, "development");
    assert.equal(res.valid, false);
    assert.match(res.error || "", /Conflicting database connection strings/);
  } finally {
    process.env.DATABASE_URL = origUrl;
    process.env.MONGODB_URI = origMongo;
  }
});

test("mongodb connection guard: connectToDatabase enforces isolation validation", () => {
  assert.ok(mongodbModule.includes("validateDatabaseConnection"));
  assert.ok(mongodbModule.includes("isolation.valid"));
  assert.ok(mongodbModule.includes("throw new Error(isolation.error)"));
});

test("sslcommerz live readiness: sandbox credentials rejected in production", async () => {
  const { isSslcommerzLiveReady, isOnlinePaymentAvailableForEnvironment } = await import(
    "../src/server/payments/config/sslcommerz.ts"
  );

  // Mock sandbox credentials
  const sandboxCreds = {
    storeId: "testbox_12345",
    storePassword: "dummy_password",
    mode: "sandbox",
  };
  assert.equal(isSslcommerzLiveReady(sandboxCreds), false);

  // When live flag is set but store ID starts with testbox
  const fakeLiveCreds = {
    storeId: "testbox_12345",
    storePassword: "dummy_password",
    mode: "live",
  };
  assert.equal(isSslcommerzLiveReady(fakeLiveCreds), false);

  // Valid dedicated live credentials
  const liveCreds = {
    storeId: "angkon_live_store",
    storePassword: "live_secret_password",
    mode: "live",
  };
  assert.equal(isSslcommerzLiveReady(liveCreds), true);

  // Available in dev, blocked in prod
  assert.equal(isOnlinePaymentAvailableForEnvironment("development", sandboxCreds), true);
  assert.equal(isOnlinePaymentAvailableForEnvironment("production", sandboxCreds), false);
  assert.equal(isOnlinePaymentAvailableForEnvironment("production", liveCreds), true);
});

test("sslcommerz payment initiation: production blocks sandbox payment attempts", () => {
  assert.ok(initiatePaymentService.includes("isSslcommerzLiveReady"));
  assert.ok(initiatePaymentService.includes("SANDBOX_NOT_ALLOWED_IN_PRODUCTION"));
  assert.ok(verifyPaymentService.includes("sandbox_rejected_in_production"));
});

test("courier safety: non-production forces mock mode and disables live bookings", async () => {
  const { getCourierModeConfig, isLocalTestOrder } = await import(
    "../src/server/courier/core/courier-mode.ts"
  );

  // Non-production must force mock
  const devCourier = getCourierModeConfig();
  assert.equal(devCourier.mode, "mock");
  assert.equal(devCourier.liveBookingEnabled, false);
  assert.ok(devCourier.reason?.includes("Mock courier mode strictly enforced"));

  // Local test order detection works
  assert.equal(isLocalTestOrder("ANG-TEST-12345"), true);
  assert.equal(isLocalTestOrder("ANG-887618-237", { phone: "01700000000" }), true);
});

test("external side-effects: emails suppressed in non-production", () => {
  assert.ok(emailModule.includes("appEnv !== \"production\""));
  assert.ok(emailModule.includes("ENABLE_REAL_EMAIL"));
  assert.ok(emailModule.includes("Non-production email delivery suppressed"));
});

test("external side-effects: Cloudinary deletions blocked in non-production", () => {
  assert.ok(cloudinaryModule.includes("appEnv !== \"production\""));
  assert.ok(cloudinaryModule.includes("ALLOW_PROD_CLOUDINARY_MUTATIONS"));
  assert.ok(cloudinaryModule.includes("safely mocked"));
});

test("external side-effects: Meta CAPI events protected without test code", () => {
  assert.ok(metaCapiModule.includes("appEnv !== \"production\""));
  assert.ok(metaCapiModule.includes("testCode"));
  assert.ok(metaCapiModule.includes("ENABLE_PRODUCTION_META_EVENTS"));
});
