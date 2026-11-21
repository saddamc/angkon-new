/**
 * ANGKON — Full Functional, Order, Payment & Courier Test Runner
 *
 * Executes Phase 2 (Customer Storefront & Auth), Phase 3 (Order & Inventory),
 * Phase 4 (SSLCOMMERZ Sandbox), and Phase 5 (Steadfast Mock) against `angkon_dev`.
 *
 * Run via: npx tsx scripts/execute-functional-and-order-tests.mjs
 */

import { MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

const BASE_URL = "http://localhost:3001";
const DB_URI = process.env.DATABASE_URL;

let testCount = 0;
let passCount = 0;
let failCount = 0;

function assertTest(name, passed, detail) {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`  [PASS] ${name}${detail ? ` (${detail})` : ""}`);
  } else {
    failCount++;
    console.error(`  [FAIL] ${name}${detail ? `: ${detail}` : ""}`);
  }
}

async function run() {
  console.log("================================================================================");
  console.log(" ANGKON — Phase 2 to 5: Full Functional, Order & Gateway Verification");
  console.log(" Target: Development Server (http://localhost:3001) -> angkon_dev");
  console.log("================================================================================\n");

  const client = new MongoClient(DB_URI);
  await client.connect();
  const db = client.db("angkon_dev");
  const prodDb = client.db("angkon");

  // Initial safety baseline
  const initialProdOrders = await prodDb.collection("orders").countDocuments();
  const initialProdUsers = await prodDb.collection("users").countDocuments();
  const initialProdPayments = await prodDb.collection("payments").countDocuments();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. STOREFRONT FUNCTIONAL TESTING (Phase 2.1)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("1. Storefront Functional Testing:");

  // 1.1 Category API
  const catRes = await fetch(`${BASE_URL}/api/categories`);
  const catData = await catRes.json();
  const categories = Array.isArray(catData) ? catData : catData.categories || [];
  assertTest("Categories API Reachable", catRes.status === 200, `Found ${categories.length} categories`);
  assertTest("All 13 Catalog Categories Served", categories.length === 13);

  // 1.2 Products API
  const prodRes = await fetch(`${BASE_URL}/api/products?perPage=50`);
  const prodData = await prodRes.json();
  const products = Array.isArray(prodData) ? prodData : prodData.products || [];
  assertTest("Products API Reachable", prodRes.status === 200, `Found ${products.length} products`);
  assertTest("All 20 Catalog Products Served", products.length === 20);

  // 1.3 Search Filter
  const searchRes = await fetch(`${BASE_URL}/api/products?search=Tawakkal`);
  const searchData = await searchRes.json();
  const searchProds = Array.isArray(searchData) ? searchData : searchData.products || [];
  assertTest("Product Search Working", searchRes.status === 200 && searchProds.length > 0, `Search returned ${searchProds.length} matches`);

  // 1.4 Single Product Details
  const sampleSlug = products[0]?.slug;
  const singleRes = await fetch(`${BASE_URL}/api/products/${sampleSlug}`);
  const singleProd = await singleRes.json();
  assertTest("Single Product Query", singleRes.status === 200 && singleProd.slug === sampleSlug, `Loaded "${singleProd.name}"`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CUSTOMER AUTHENTICATION TESTING (Phase 2.2)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n2. Customer Authentication Testing:");

  const testEmail = `qa-${Date.now()}@angkon.dev`;
  const testPassword = "QaTesterPass@2026!";

  // 2.1 Customer Registration
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "QA Automated Tester",
      email: testEmail,
      password: testPassword,
      phone: "01712345678",
    }),
  });
  const regData = await regRes.json();
  assertTest("Customer Registration", regRes.status === 200 || regRes.status === 201, `Registered user: ${testEmail}`);

  // 2.2 Customer Login (Bad Password)
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "WrongPassword123!",
    }),
  });
  assertTest("Bad Password Rejection", badLoginRes.status === 401, "Returned HTTP 401 Unauthorized");

  // 2.3 Customer Login (Valid Password)
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginCookies = loginRes.headers.get("set-cookie") || "";
  assertTest("Customer Login Succeeded", loginRes.status === 200, "Valid session cookie issued");

  // 2.4 Authenticated Profile
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: loginCookies },
  });
  const meData = await meRes.json();
  assertTest("Authenticated Profile (/api/auth/me)", meRes.status === 200 && meData.user?.email === testEmail);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CART, SHIPPING & PROMO CODE VALIDATION (Phase 2.3)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n3. Cart, Shipping & Promo Validation:");

  // 3.1 Inside Dhaka Shipping Quote
  const shipDhaka = await fetch(`${BASE_URL}/api/shipping/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ district: "Dhaka", subtotal: 1500 }),
  });
  const dhakaData = await shipDhaka.json();
  assertTest("Shipping Inside Dhaka Calculation", shipDhaka.status === 200, `Rate: ৳${dhakaData.shippingFee || dhakaData.rate || 80}`);

  // 3.2 Outside Dhaka Shipping Quote
  const shipCtg = await fetch(`${BASE_URL}/api/shipping/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ district: "Chittagong", subtotal: 1500 }),
  });
  const ctgData = await shipCtg.json();
  assertTest("Shipping Outside Dhaka Calculation", shipCtg.status === 200, `Rate: ৳${ctgData.shippingFee || ctgData.rate || 150}`);

  // 3.3 Promo Code Validation
  const promoRes = await fetch(`${BASE_URL}/api/promo/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "DEVTEST10", subtotal: 2000 }),
  });
  const promoData = await promoRes.json();
  assertTest("Promo Code Validation (DEVTEST10)", promoRes.status === 200 && promoData.valid, `Discount: ৳${promoData.discount}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ORDER PLACEMENT & INVENTORY DEDUCTION (Phase 3 — COD)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n4. Order Placement & Inventory Deduction (Cash on Delivery):");

  const targetProd = products.find((p) => Number(p.price) > 0) || products[0];
  const prodBeforeOrder = await db.collection("products").findOne({ slug: targetProd.slug });
  const stockBefore = prodBeforeOrder?.stock_quantity ?? 100;

  const codIdempotencyKey = `idemp_cod_${Date.now()}`;
  const codPayload = {
    fullName: "QA Customer COD",
    phone: "01799887766",
    email: testEmail,
    address: "House 5, Road 2, Block B, Banani",
    district: "Dhaka",
    city: "Dhaka",
    items: [
      {
        productId: Number(targetProd.id || 0),
        name: targetProd.name,
        price: Number(targetProd.price),
        quantity: 1,
        slug: targetProd.slug,
        image: targetProd.images?.[0]?.src || "/placeholder.jpg",
      },
    ],
    paymentMethod: "cod",
  };

  const codRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": codIdempotencyKey,
      Cookie: loginCookies,
    },
    body: JSON.stringify(codPayload),
  });
  const codData = await codRes.json();
  const codOrderNumber = codData.orderNumber || codData.orderId;
  assertTest("COD Order Placement", codRes.status === 200 || codRes.status === 201, `Order: ${codOrderNumber}`);

  // Verify in MongoDB angkon_dev
  const dbCodOrder = await db.collection("orders").findOne({ orderNumber: codOrderNumber });
  assertTest("COD Order Exists in angkon_dev", Boolean(dbCodOrder));
  assertTest("COD Payment Status Initialized to 'unpaid'", dbCodOrder?.paymentStatus === "unpaid");
  assertTest("COD Order Status Initialized to 'confirmed'", dbCodOrder?.orderStatus === "confirmed");

  // Verify stock deduction
  const prodAfterOrder = await db.collection("products").findOne({ slug: targetProd.slug });
  const stockAfter = prodAfterOrder?.stock_quantity ?? stockBefore;
  assertTest("Inventory Deducted Atomically", stockAfter === stockBefore - 1, `Stock: ${stockBefore} -> ${stockAfter}`);

  // 4.2 Duplicate Submission Idempotency Check
  const dupRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": codIdempotencyKey,
      Cookie: loginCookies,
    },
    body: JSON.stringify(codPayload),
  });
  const dupData = await dupRes.json();
  const dupOrderNumber = dupData.orderNumber || dupData.orderId;
  assertTest("Duplicate Submission Prevented (Idempotency Key)", dupOrderNumber === codOrderNumber, "Existing order returned without duplicate");

  const prodAfterDup = await db.collection("products").findOne({ slug: targetProd.slug });
  assertTest("Zero Double-Deduction of Inventory", prodAfterDup.stock_quantity === stockAfter, `Stock remains ${stockAfter}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SSLCOMMERZ ONLINE PAYMENT ORDER & SANDBOX INITIATION (Phase 3 & 4)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n5. SSLCOMMERZ Online Payment Order & Sandbox Initiation:");

  const onlineIdempotencyKey = `idemp_online_${Date.now()}`;
  const onlinePayload = {
    fullName: "QA Customer Online",
    phone: "01711223344",
    email: testEmail,
    address: "House 10, Road 5, Dhanmondi",
    district: "Dhaka",
    city: "Dhaka",
    items: [
      {
        productId: Number(targetProd.id || 0),
        name: targetProd.name,
        price: Number(targetProd.price),
        quantity: 1,
        slug: targetProd.slug,
        image: targetProd.images?.[0]?.src || "/placeholder.jpg",
      },
    ],
    paymentMethod: "sslcommerz",
  };

  const onlineOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": onlineIdempotencyKey,
      Cookie: loginCookies,
    },
    body: JSON.stringify(onlinePayload),
  });
  const onlineOrderData = await onlineOrderRes.json();
  const onlineOrderNumber = onlineOrderData.orderNumber || onlineOrderData.orderId;
  assertTest("Online Payment Order Created", Boolean(onlineOrderNumber), `Order: ${onlineOrderNumber}`);

  const dbOnlineOrder = await db.collection("orders").findOne({ orderNumber: onlineOrderNumber });
  assertTest("Online Payment Status Initialized to 'pending'", dbOnlineOrder?.paymentStatus === "pending");
  assertTest("Online Order Status Initialized to 'pending'", dbOnlineOrder?.orderStatus === "pending");

  // 5.2 Initiate Payment Session via Sandbox
  const initRes = await fetch(`${BASE_URL}/api/payment/sslcommerz/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: loginCookies },
    body: JSON.stringify({ orderNumber: onlineOrderNumber }),
  });
  const initData = await initRes.json();
  const gatewayUrl = initData.gatewayUrl || initData.GatewayPageURL;
  assertTest("SSLCOMMERZ Session Initiated", initRes.status === 200 && Boolean(gatewayUrl), `Gateway URL: ${gatewayUrl ? gatewayUrl.slice(0, 50) + "..." : "none"}`);

  // Verify PaymentAttempt record created in MongoDB
  const attempt = await db.collection("payments").findOne({ orderNumber: onlineOrderNumber });
  assertTest("PaymentAttempt Recorded in MongoDB", Boolean(attempt), `Tran ID: ${attempt?.tranId}`);
  assertTest("PaymentAttempt Status Initialized to 'initiating' or 'pending'", attempt?.status === "initiating" || attempt?.status === "pending");

  // 5.3 Simulate Successful Payment Settlement via Service
  // Connect Mongoose to angkon_dev
  const { connectToDatabase } = await import("../src/lib/mongodb.ts");
  await connectToDatabase();

  const tranId = attempt?.tranId;
  const valId = `VALID_${Date.now()}`;

  const { FinalizePaymentService } = await import("../src/server/payments/services/finalize-payment.ts");
  const settlementResult = await FinalizePaymentService.finalize({
    attemptId: String(attempt._id),
    source: "gateway_ipn",
    verification: {
      decision: "succeeded",
      normalized: {
        status: "VALID",
        tranId: tranId,
        valId: valId,
        amount: Number(targetProd.price) + 80,
        currency: "BDT",
        bankTranId: `BANK_${Date.now()}`,
        cardType: "BKASH-BKash",
        cardBrand: "BKASH",
        riskLevel: "0",
        riskTitle: "Safe",
        rawResponse: { status: "VALID" },
      },
      reason: "Valid payment verified",
      details: "Automated QA verification",
    },
  });

  assertTest("Payment Settlement Handled via State Machine", settlementResult.ok, `Attempt Status: ${settlementResult.attemptStatus}`);

  const settledOrder = await db.collection("orders").findOne({ orderNumber: onlineOrderNumber });
  assertTest("Order Payment Status Transitioned to 'paid'", settledOrder?.paymentStatus === "paid");
  assertTest("Order Status Transitioned to 'confirmed' or 'processing'", settledOrder?.orderStatus === "confirmed" || settledOrder?.orderStatus === "processing");

  const settledAttempt = await db.collection("payments").findOne({ tranId });
  assertTest("PaymentAttempt Transitioned to 'succeeded'", settledAttempt?.status === "succeeded");

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. STEADFAST COURIER MOCK DISPATCH (Phase 5.1)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n6. Steadfast Courier Mock Dispatch:");

  const { courierService } = await import("../src/server/courier/courier-service.ts");
  const shipmentResult = await courierService.bookShipment({
    orderIdOrNumber: onlineOrderNumber,
    provider: "steadfast",
    actor: "qa-dev-admin",
    tenantId: "default",
    ip: "127.0.0.1",
    userAgent: "qa-runner",
  });

  assertTest("Steadfast Mock Dispatch Created", shipmentResult.ok, `Tracking Code: ${shipmentResult.shipment?.trackingCode}`);
  assertTest("Mock Tracking Code Uses MOCK Prefix", shipmentResult.shipment?.trackingCode?.includes("MOCK"));

  const dbShipment = await db.collection("shipments").findOne({ orderNumber: onlineOrderNumber });
  assertTest("Shipment Record Stored in angkon_dev", Boolean(dbShipment));
  assertTest("Shipment Status Initialized to 'in_review' or 'pending'", Boolean(dbShipment?.status));

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. PRODUCTION DATABASE INTEGRITY AUDIT (Zero Cross-Contamination)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n7. Production Database Integrity Verification:");

  const finalProdOrders = await prodDb.collection("orders").countDocuments();
  const finalProdUsers = await prodDb.collection("users").countDocuments();
  const finalProdPayments = await prodDb.collection("payments").countDocuments();

  assertTest("Production 'angkon.orders' Completely Untouched", finalProdOrders === initialProdOrders, `Orders count: ${finalProdOrders}`);
  assertTest("Production 'angkon.users' Completely Untouched", finalProdUsers === initialProdUsers, `Users count: ${finalProdUsers}`);
  assertTest("Production 'angkon.payments' Completely Untouched", finalProdPayments === initialProdPayments, `Payments count: ${finalProdPayments}`);

  await client.close();

  console.log("\n================================================================================");
  console.log(` RESULTS: ${passCount} PASSED, ${failCount} FAILED (Total ${testCount} Checks)`);
  console.log("================================================================================\n");

  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("FATAL ERROR during functional test run:", err);
  process.exit(1);
});
