#!/usr/bin/env node
/**
 * ANGKON — VPS Live Deployment Pre-Flight Verification Script
 *
 * Verifies environment variables, database connectivity, and external service
 * credentials before starting the systemd service in production.
 *
 * Usage:
 *   node scripts/verify-vps-readiness.mjs
 */

import mongoose from "mongoose";
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";

// Auto-load env file if running standalone outside systemd
function loadEnvIfPresent() {
  const candidates = [
    process.env.ENV_FILE,
    "/var/www/angkon/shared/.env",
    path.resolve(process.cwd(), ".env.production"),
    path.resolve(process.cwd(), ".env"),
  ].filter(Boolean);

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      console.log(`[Env] Loaded environment from: ${file}`);
      const content = fs.readFileSync(file, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

loadEnvIfPresent();

const DNS_OVERRIDE = process.env.MONGODB_DNS_SERVERS?.trim();
if (DNS_OVERRIDE) {
  try {
    const servers = DNS_OVERRIDE.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (servers.length > 0) {
      dns.setServers(servers);
      console.log(`[DNS] Applied custom DNS servers: ${servers.join(", ")}`);
    }
  } catch (err) {
    console.warn("[DNS] Could not set DNS servers:", err.message);
  }
}

console.log("================================================================================");
console.log(" ANGKON — VPS Production Deployment Pre-Flight Check");
console.log("================================================================================\n");

let failures = 0;
let warnings = 0;

function pass(title, detail) {
  console.log(`  [PASS] ${title}${detail ? ` (${detail})` : ""}`);
}

function fail(title, detail) {
  failures++;
  console.log(`  [FAIL] ${title}${detail ? ` — ${detail}` : ""}`);
}

function warn(title, detail) {
  warnings++;
  console.log(`  [WARN] ${title}${detail ? ` — ${detail}` : ""}`);
}

// 1. Environment Resolution
console.log("1. Environment & Server Configuration:");
const env = process.env.APP_ENVIRONMENT || process.env.NODE_ENV || "development";
const nodeEnv = process.env.NODE_ENV || "development";
if (env === "production" && nodeEnv === "production") {
  pass("Production Environment Set", `APP_ENVIRONMENT=${env}, NODE_ENV=${nodeEnv}`);
} else {
  warn("Non-Production Environment Detected", `APP_ENVIRONMENT=${env}, NODE_ENV=${nodeEnv}`);
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (siteUrl && siteUrl.startsWith("https://")) {
  pass("Site URL Configured", siteUrl);
} else {
  fail("Site URL Invalid", `NEXT_PUBLIC_SITE_URL must be set to https://... (got: "${siteUrl || ""}")`);
}

// 2. Secrets & Encryption
console.log("\n2. Core Security Secrets:");
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.length >= 32 && !jwtSecret.includes("development") && !jwtSecret.includes("change-this")) {
  pass("JWT_SECRET Strength", `${jwtSecret.length} chars (secure)`);
} else {
  fail("JWT_SECRET Insecure", "Must be at least 32 characters and non-default");
}

const cronSecret = process.env.CRON_SECRET;
if (cronSecret && cronSecret.length >= 16 && !cronSecret.includes("development") && !cronSecret.includes("change-this")) {
  pass("CRON_SECRET Strength", `${cronSecret.length} chars (secure)`);
} else {
  fail("CRON_SECRET Insecure", "Must be at least 16 characters and non-default");
}

// 3. Payment Gateway Configuration
console.log("\n3. SSLCOMMERZ Payment Gateway Readiness:");
const sslMode = process.env.SSLCOMMERZ_MODE;
const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";
const storeId = process.env.SSLCOMMERZ_LIVE_STORE_ID || process.env.SSLCOMMERZ_STORE_ID;
const storePass = process.env.SSLCOMMERZ_LIVE_STORE_PASSWORD || process.env.SSLCOMMERZ_STORE_PASS;

if (env === "production") {
  if (sslMode === "live" && isLive) {
    pass("SSLCOMMERZ Live Mode Enabled");
  } else {
    fail("SSLCOMMERZ Mode Mismatch", `Production requires SSLCOMMERZ_MODE=live and SSLCOMMERZ_IS_LIVE=true (got mode: "${sslMode}", isLive: ${isLive})`);
  }

  if (storeId && !storeId.toLowerCase().includes("testbox")) {
    pass("SSLCOMMERZ Live Store ID Configured", storeId);
  } else {
    fail("SSLCOMMERZ Invalid Live Store ID", `Live Store ID cannot be 'testbox' in production (got: "${storeId || ""}")`);
  }

  if (storePass && storePass.length > 5) {
    pass("SSLCOMMERZ Live Store Password Configured");
  } else {
    fail("SSLCOMMERZ Store Password Missing");
  }
} else {
  pass("Sandbox Mode Active (Non-Production)", `Mode: ${sslMode || "sandbox"}, Store: ${storeId || "testbox"}`);
}

// 4. Courier Gateway Configuration
console.log("\n4. Steadfast Courier Gateway Readiness:");
const courierMode = process.env.COURIER_MODE;
const liveBooking = process.env.STEADFAST_LIVE_BOOKING_ENABLED === "true";
const sfApiKey = process.env.STEADFAST_API_KEY;
const sfSecretKey = process.env.STEADFAST_SECRET_KEY;

if (env === "production") {
  if (courierMode === "live" && liveBooking) {
    pass("Steadfast Live Courier Mode Configured");
  } else {
    fail("Courier Mode Not Live", `Production requires COURIER_MODE=live and STEADFAST_LIVE_BOOKING_ENABLED=true`);
  }

  if (sfApiKey && sfSecretKey) {
    pass("Steadfast API & Secret Keys Configured");
  } else {
    fail("Steadfast Credentials Missing", "STEADFAST_API_KEY and STEADFAST_SECRET_KEY must be provided");
  }
} else {
  pass("Mock / Sandbox Courier Active", `Mode: ${courierMode || "mock"}`);
}

// 5. Database Connection Test
console.log("\n5. Database Connectivity & Multi-Host Verification:");
const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!mongoUri) {
  fail("DATABASE_URL Missing", "No connection string found in environment");
} else {
  try {
    const isDirect = mongoUri.startsWith("mongodb://");
    const isSrv = mongoUri.startsWith("mongodb+srv://");
    pass("Connection String Format", isDirect ? "Direct Replica-Set (Recommended)" : (isSrv ? "SRV Protocol" : "Unknown"));

    console.log("  Connecting to MongoDB...");
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout after 8000ms. Check VPS IP in Atlas Allowlist.")), 8000)
    );
    const connection = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    await Promise.race([connection, timeout]);
    const dbName = mongoose.connection.db?.databaseName;
    pass("Connected Successfully to MongoDB", `Database: "${dbName}"`);

    if (env === "production" && dbName !== "angkon") {
      fail("Production Database Isolation Violation", `Production must use database 'angkon', but connected to '${dbName}'`);
    } else if (env !== "production" && dbName === "angkon") {
      fail("Non-Production Isolation Violation", `Development/staging cannot use production database 'angkon'`);
    } else {
      pass("Database Isolation Guard Confirmed");
    }

    await mongoose.disconnect();
  } catch (err) {
    fail("Database Connection Failed", err.message);
  }
}

console.log("\n================================================================================");
if (failures === 0) {
  console.log(` RESULT: PRE-FLIGHT CHECKS PASSED (${warnings} warnings).`);
  console.log(" Ready to run: sudo systemctl restart angkon");
  console.log("================================================================================\n");
  process.exit(0);
} else {
  console.log(` RESULT: PRE-FLIGHT FAILED WITH ${failures} ERRORS (${warnings} warnings).`);
  console.log(" Please resolve the issues above before starting production services.");
  console.log("================================================================================\n");
  process.exit(1);
}
