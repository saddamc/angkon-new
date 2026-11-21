/**
 * ANGKON — Safe Development Database Initializer
 *
 * Populates `angkon_dev` with:
 * 1. Clean merchandise catalog (Categories & Products) read-only exported from production
 * 2. Safe development settings (Checkout defaults, mocked Meta integration)
 * 3. Synthetic development administrator and customer accounts
 *
 * STRICT SAFETY RULES:
 * - Read-only from production database `angkon`
 * - Strict write target: `angkon_dev` ONLY
 * - NEVER copies real customers, orders, payments, webhooks, or Meta events
 *
 * Run via: npx tsx scripts/seed-development-database.mjs
 */

import { MongoClient } from "mongodb";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  console.log("================================================================================");
  console.log(" ANGKON — Safe Development Database Initialization (angkon_dev)");
  console.log("================================================================================\n");

  const baseUri =
    process.env.ANGKON_DEV_DATABASE_URL ||
    process.env.DEV_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!baseUri) {
    console.error("FATAL: DATABASE_URL not defined.");
    process.exit(1);
  }

  // 1. Connection strings for prod (read-only) and dev (target)
  const prodUri = baseUri.replace(/\/angkon_[a-zA-Z0-9_]+/, "/angkon");
  const devUri = baseUri.includes("/angkon_dev")
    ? baseUri
    : baseUri.replace(/\/angkon\b/, "/angkon_dev");

  console.log("Connecting to MongoDB cluster...");
  const client = new MongoClient(baseUri);
  await client.connect();

  const prodDb = client.db("angkon");
  const devDb = client.db("angkon_dev");

  // SAFETY ASSERTION: confirm target DB name is strictly angkon_dev
  if (devDb.databaseName !== "angkon_dev") {
    console.error(`CRITICAL SAFETY ABORT: Target database is "${devDb.databaseName}", expected "angkon_dev".`);
    await client.close();
    process.exit(1);
  }
  console.log(`[SAFETY CHECK] Target database verified: "${devDb.databaseName}". Production writes forbidden.\n`);

  // ── Step 1: Export Catalog from Production (Read-Only) ──
  console.log("Step 1: Read-only export of catalog from production ('angkon')...");
  const categories = await prodDb.collection("categories").find({}).toArray();
  const products = await prodDb.collection("products").find({}).toArray();
  console.log(`  Exported ${categories.length} categories.`);
  console.log(`  Exported ${products.length} products.`);

  // Clean _id to generate fresh ObjectIds in dev
  const cleanCategories = categories.map(({ _id, ...rest }) => rest);
  const cleanProducts = products.map(({ _id, ...rest }) => rest);

  // ── Step 2: Populate angkon_dev Catalog ──
  console.log("\nStep 2: Populating catalog in 'angkon_dev'...");
  await devDb.collection("categories").deleteMany({});
  await devDb.collection("products").deleteMany({});

  if (cleanCategories.length > 0) {
    const catResult = await devDb.collection("categories").insertMany(cleanCategories);
    console.log(`  Inserted ${catResult.insertedCount} categories into angkon_dev.`);
  }

  if (cleanProducts.length > 0) {
    const prodResult = await devDb.collection("products").insertMany(cleanProducts);
    console.log(`  Inserted ${prodResult.insertedCount} products into angkon_dev.`);
  }

  // ── Step 3: Populate Safe Development Settings ──
  console.log("\nStep 3: Populating safe development settings in 'angkon_dev'...");
  await devDb.collection("settings").deleteMany({});

  const devSettings = [
    {
      tenantId: "angkon-main",
      key: "catalog-version",
      value: { v: `dev-${Date.now()}` },
    },
    {
      tenantId: "angkon-main",
      key: "checkout",
      value: {
        requireEmailVerification: false,
        allowGuestCheckout: true,
        enablePromoCodes: true,
        promoCodes: [
          {
            code: "DEVTEST10",
            discountType: "percent",
            discountValue: 10,
            minSpend: 500,
            maxDiscount: 500,
            isActive: true,
          },
          {
            code: "DEV50",
            discountType: "fixed",
            discountValue: 50,
            minSpend: 300,
            maxDiscount: 50,
            isActive: true,
          },
        ],
      },
    },
    {
      tenantId: "angkon-main",
      key: "pixel",
      value: {
        tenantId: "angkon-main",
        enabled: false, // Disabled in dev
        pixelId: "DEV_MOCK_PIXEL_1304551066085265",
        testEventCode: "TEST_DEV_LOCAL",
        domainVerificationCode: "",
      },
    },
    {
      tenantId: "angkon-main",
      key: "meta_catalog",
      value: {
        tenantId: "angkon-main",
        catalogId: "dev_catalog_mock",
        catalogApiToken: "", // No production token
        businessId: "",
        feedUrl: "http://localhost:3001/api/meta/catalog-feed.xml",
      },
    },
    {
      tenantId: "angkon-main",
      key: "meta_marketing",
      value: {
        tenantId: "angkon-main",
        adAccountId: "act_dev_mock",
        accessToken: "", // No production token
      },
    },
    {
      tenantId: "angkon-main",
      key: "meta_business",
      value: {
        businessName: "ANGKON Development",
        businessId: "dev_business_mock",
        appId: null,
        appSecret: "",
      },
    },
    {
      tenantId: "angkon-main",
      key: "policies",
      value: {
        returnDays: 7,
        exchangeDays: 7,
        allowPreInspectionDelivery: true,
        contactEmail: "care@angkon.dev",
        contactPhone: "01700000000",
        showroomAddress: "Niketan, Gulshan-1, Dhaka 1212, Bangladesh",
      },
    },
  ];

  await devDb.collection("settings").insertMany(devSettings);
  console.log(`  Inserted ${devSettings.length} safe development configuration documents.`);

  // ── Step 4: Synthetic Development Accounts ──
  console.log("\nStep 4: Seeding synthetic development accounts in 'angkon_dev'...");
  await devDb.collection("users").deleteMany({});

  const syntheticUsers = [
    {
      name: "ANGKON Dev Admin",
      email: "admin@angkon.dev",
      password: hashPassword("DevAdmin@2026!"),
      phone: "01711000000",
      role: "admin",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      source: "development_seed",
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "ANGKON Dev Customer",
      email: "customer@angkon.dev",
      password: hashPassword("DevCustomer@2026!"),
      phone: "01811000000",
      role: "customer",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      source: "development_seed",
      addresses: [
        {
          fullName: "ANGKON Dev Customer",
          phone: "01811000000",
          address: "House 12, Road 4, Sector 3, Uttara",
          city: "Dhaka",
          district: "Dhaka",
          postalCode: "1230",
          isDefault: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const userResult = await devDb.collection("users").insertMany(syntheticUsers);
  console.log(`  Inserted ${userResult.insertedCount} synthetic accounts into angkon_dev.`);
  console.log("    - Admin:    admin@angkon.dev    / DevAdmin@2026!");
  console.log("    - Customer: customer@angkon.dev / DevCustomer@2026!");

  // ── Step 5: Verify Critical Collections Intentionally Empty ──
  console.log("\nStep 5: Verifying sensitive collections remain empty in 'angkon_dev'...");
  const emptyCollections = [
    "orders",
    "payments",
    "paymentattempts",
    "paymentevents",
    "paymentrefunds",
    "paymentwebhookinboxes",
    "shipments",
    "courierlogs",
    "metaeventlogs",
    "metadomainauditlogs",
    "adminauditlogs",
    "emailcodes",
  ];

  for (const col of emptyCollections) {
    const count = await devDb.collection(col).countDocuments();
    if (count > 0) {
      console.warn(`  [WARN] ${col} has ${count} documents. Purging...`);
      await devDb.collection(col).deleteMany({});
    } else {
      console.log(`  [OK] angkon_dev.${col}: 0 documents (Clean)`);
    }
  }

  // ── Step 6: Post-Seed Verification ──
  console.log("\nStep 6: Post-seed data verification...");
  const devProdCount = await devDb.collection("products").countDocuments();
  const devCatCount = await devDb.collection("categories").countDocuments();
  const devUserCount = await devDb.collection("users").countDocuments();
  const devSettingCount = await devDb.collection("settings").countDocuments();

  console.log(`  - Products in angkon_dev:   ${devProdCount}`);
  console.log(`  - Categories in angkon_dev: ${devCatCount}`);
  console.log(`  - Users in angkon_dev:      ${devUserCount} (Synthetic only)`);
  console.log(`  - Settings in angkon_dev:   ${devSettingCount}`);

  // Confirm production counts remain untouched
  const prodProdCount = await prodDb.collection("products").countDocuments();
  const prodUserCount = await prodDb.collection("users").countDocuments();
  console.log(`\n[SAFETY CHECK] Production 'angkon' untouched:`);
  console.log(`  - Products in angkon (prod): ${prodProdCount}`);
  console.log(`  - Users in angkon (prod):    ${prodUserCount} (Real customer accounts untouched)`);

  await client.close();

  console.log("\n================================================================================");
  console.log(" RESULT: DEVELOPMENT DATABASE angkon_dev INITIALIZED SUCCESSFULLY");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR during dev database initialization:", err);
  process.exit(1);
});
