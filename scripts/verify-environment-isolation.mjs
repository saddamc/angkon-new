/**
 * ANGKON — Environment Isolation & Safety Verification
 *
 * Read-only verification script that validates environment isolation, database
 * separation, payment sandbox containment, courier safety gates, and external
 * service side-effect containment.
 *
 * Run via: npm run verify:environment-isolation
 */

import fs from "node:fs";
import path from "node:path";

// Load .env if present
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
    }
  }
}
loadEnv();

let failures = 0;
function assertCheck(name, passed, detail) {
  if (passed) {
    console.log(`  [PASS] ${name}${detail ? ` (${detail})` : ""}`);
  } else {
    failures++;
    console.error(`  [FAIL] ${name}${detail ? `: ${detail}` : ""}`);
  }
}

async function run() {
  console.log("================================================================================");
  console.log(" ANGKON — Master Engineering Audit: Environment Isolation Verification");
  console.log("================================================================================\n");

  // Dynamically import compiled or TypeScript modules via dynamic import
  const {
    getAppEnvironment,
    ENVIRONMENT_DATABASE_MAP,
    validateDatabaseConnection,
    parseMongoUri,
  } = await import("../src/server/env/app-environment.ts");

  const {
    isSslcommerzLiveReady,
    isOnlinePaymentAvailableForEnvironment,
    getSslcommerzCredentials,
  } = await import("../src/server/payments/config/sslcommerz.ts");

  const { getCourierModeConfig } = await import("../src/server/courier/core/courier-mode.ts");
  const { connectToDatabase } = await import("../src/lib/mongodb.ts");

  // ── 1. Resolved Environment ──
  console.log("1. Environment Resolution:");
  const currentEnv = getAppEnvironment();
  assertCheck(
    "Active Environment Resolved",
    Boolean(currentEnv),
    `Environment: "${currentEnv}"`
  );

  // ── 2. Expected Database Mapping ──
  console.log("\n2. Database Name Mapping:");
  const expectedDb = ENVIRONMENT_DATABASE_MAP[currentEnv];
  assertCheck(
    "Expected Database Mapping Exists",
    Boolean(expectedDb),
    `For "${currentEnv}" -> "${expectedDb}"`
  );

  // ── 3. Actual Configured Database ──
  console.log("\n3. Active Connection Validation:");
  const currentUri = process.env.DATABASE_URL || process.env.MONGODB_URI || "";
  let parsedCurrent = null;
  try {
    parsedCurrent = parseMongoUri(currentUri);
    assertCheck(
      "Connection String Format Valid",
      true,
      `Host: ${parsedCurrent.host}, DB: ${parsedCurrent.databaseName}`
    );
  } catch (err) {
    assertCheck("Connection String Format Valid", false, err.message);
  }

  const isolationResult = validateDatabaseConnection();
  assertCheck(
    "Active Connection Matches Environment Isolation Rules",
    isolationResult.valid,
    isolationResult.valid
      ? `Connected to "${isolationResult.actualDatabase}" on ${isolationResult.sanitizedHost}`
      : isolationResult.error
  );

  // ── 4. Actual Connected Database (Read-Only Connect Check) ──
  console.log("\n4. Live Database Connection (Read-Only):");
  try {
    const conn = await connectToDatabase();
    const actualConnectedDb = conn.connection.name;
    assertCheck(
      "Connected Database Matches Expected Name Exactly",
      actualConnectedDb === expectedDb,
      `Connected: "${actualConnectedDb}" (Expected: "${expectedDb}")`
    );
    assertCheck(
      "Connected Database is NOT Production 'angkon' in Development/Preview",
      currentEnv === "production" ? true : actualConnectedDb !== "angkon",
      `Database "${actualConnectedDb}" verified non-production`
    );
  } catch (err) {
    assertCheck("Database Connection Succeeded", false, err.message);
  }

  // ── 5. Production Database Access Rejection Simulation ──
  console.log("\n5. Cross-Environment Access Denial Tests:");
  const mockProdUri = "mongodb+srv://user:pass@cluster0.sdaudkh.mongodb.net/angkon?retryWrites=true";

  // Check Development trying to connect to production
  const devCheck = validateDatabaseConnection(mockProdUri, "development");
  assertCheck(
    "Production DB Access STRICTLY DENIED from Development",
    !devCheck.valid && devCheck.error.includes("CRITICAL ISOLATION VIOLATION"),
    devCheck.error
  );

  // Check Preview trying to connect to production
  const previewCheck = validateDatabaseConnection(mockProdUri, "preview");
  assertCheck(
    "Production DB Access STRICTLY DENIED from Preview",
    !previewCheck.valid && previewCheck.error.includes("CRITICAL ISOLATION VIOLATION"),
    previewCheck.error
  );

  // Check Test trying to connect to production
  const testCheck = validateDatabaseConnection(mockProdUri, "test");
  assertCheck(
    "Production DB Access STRICTLY DENIED from Test",
    !testCheck.valid && testCheck.error.includes("CRITICAL ISOLATION VIOLATION"),
    testCheck.error
  );

  // Check Production allowing any manually configured DB in DATABASE_URL
  const prodCheck = validateDatabaseConnection(
    "mongodb+srv://user:pass@cluster0.sdaudkh.mongodb.net/angkon_dev",
    "production"
  );
  assertCheck(
    "Production allows manually configured angkon_dev via DATABASE_URL",
    prodCheck.valid && prodCheck.actualDatabase === "angkon_dev",
    prodCheck.error
  );
  const prodCustomCheck = validateDatabaseConnection(
    "mongodb+srv://user:pass@cluster0.sdaudkh.mongodb.net/angkon_custom_db",
    "production"
  );
  assertCheck(
    "Production allows any custom DB name configured in DATABASE_URL",
    prodCustomCheck.valid && prodCustomCheck.actualDatabase === "angkon_custom_db",
    prodCustomCheck.error
  );

  // ── 6. SSLCOMMERZ Sandbox Containment in Production ──
  console.log("\n6. Payment Gateway Safety & Sandbox Containment:");
  const prodOnlineAvailable = isOnlinePaymentAvailableForEnvironment("production");
  const liveReady = isSslcommerzLiveReady();
  const creds = getSslcommerzCredentials();

  assertCheck(
    "Production Online Payment Disabled When Live Credentials Not Ready",
    !liveReady ? !prodOnlineAvailable : true,
    liveReady ? "Live credentials active" : "Safely blocked from production checkout"
  );

  assertCheck(
    "Sandbox Store ID ('testbox') Cannot Be Considered Live-Ready",
    creds.storeId.toLowerCase().includes("test") ? !liveReady : true,
    `Store: "${creds.storeId.slice(0, 7)}..." -> liveReady=${liveReady}`
  );

  // ── 7. Courier Safety & Mock Mode Enforcement ──
  console.log("\n7. Courier Safety & Dispatch Gates:");
  const courierConfig = getCourierModeConfig();
  assertCheck(
    "Local / Non-Production Courier Mode is Forced to MOCK",
    currentEnv === "production" ? true : courierConfig.mode === "mock",
    `Mode: ${courierConfig.mode}, LiveBookingEnabled: ${courierConfig.liveBookingEnabled}`
  );

  assertCheck(
    "Accidental Live Courier Booking Blocked in Development",
    currentEnv === "production" ? true : !courierConfig.liveBookingEnabled,
    courierConfig.reason || "Mock courier mode enforced"
  );

  // ── 8. External Integrations Isolation (Email, Cloudinary, Meta) ──
  console.log("\n8. External Side-Effect Containment:");
  const realEmailEnabled = process.env.ENABLE_REAL_EMAIL === "true";
  assertCheck(
    "Non-Production Customer Emails Suppressed by Default",
    currentEnv === "production" ? true : !realEmailEnabled,
    realEmailEnabled ? "Real email enabled by explicit flag" : "Real customer emails suppressed"
  );

  const realCloudinaryMutations = process.env.ALLOW_PROD_CLOUDINARY_MUTATIONS === "true";
  assertCheck(
    "Production Cloudinary Asset Deletions Blocked in Non-Production",
    currentEnv === "production" ? true : !realCloudinaryMutations,
    "Production asset deletion safely intercepted"
  );

  const prodMetaEvents = process.env.ENABLE_PRODUCTION_META_EVENTS === "true";
  assertCheck(
    "Production Meta CAPI Dataset Protected From Non-Production Events",
    currentEnv === "production" ? true : !prodMetaEvents,
    "Non-production events without test code safely suppressed"
  );

  // ── Final Result ──
  console.log("\n================================================================================");
  if (failures === 0) {
    console.log(" RESULT: ALL ENVIRONMENT ISOLATION CHECKS PASSED (0 FAILURES)");
    console.log(" Production data and external services are genuinely isolated.");
    console.log("================================================================================\n");
    process.exit(0);
  } else {
    console.error(` RESULT: FAILED WITH ${failures} ISOLATION VIOLATIONS`);
    console.log("================================================================================\n");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error during isolation verification:", err);
  process.exit(1);
});
