import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Read real JWT_SECRET from .env
const envContent = fs.readFileSync(".env", "utf-8");
const match = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const secret = match ? match[1].trim() : "angkon_secure_jwt_secret_2026";
const artifactDir = "C:\\Users\\Saddam\\.gemini\\antigravity\\brain\\2f2026a3-862e-43f4-b897-3e7a83158b5f";

async function createSuperadminToken() {
  const payload = {
    sub: "saddam13bd@gmail.com",
    name: "Saddam Superadmin",
    role: "superadmin",
    authorizedTenants: ["primary_store", "angkon-main"],
    defaultTenant: "primary_store",
    exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
  };
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

async function run() {
  const token = await createSuperadminToken();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      url: "http://localhost:3001",
    },
  ]);

  const page = await context.newPage();

  // 1. Overview Page with Clean Unified Header
  console.log("Capturing Overview clean header...");
  await page.goto("http://localhost:3001/admin/meta", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const shotOverview = path.join(artifactDir, "meta-overview-clean-header.png");
  await page.screenshot({ path: shotOverview });
  console.log("Saved:", shotOverview);

  // 2. Events Manager Overview Tab
  console.log("Capturing Events Manager Overview...");
  await page.goto("http://localhost:3001/admin/meta/events", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const shotEventsOverview = path.join(artifactDir, "meta-events-overview-tab.png");
  await page.screenshot({ path: shotEventsOverview });
  console.log("Saved:", shotEventsOverview);

  // 3. Events Manager Diagnostics Tab (Matching Image 1)
  console.log("Capturing Events Manager Diagnostics Tab...");
  await page.goto("http://localhost:3001/admin/meta/events?tab=diagnostics", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const shotDiagnostics = path.join(artifactDir, "meta-events-diagnostics-tab.png");
  await page.screenshot({ path: shotDiagnostics });
  console.log("Saved:", shotDiagnostics);

  // 4. Click Review Solution to open modal
  console.log("Opening Review Solution Modal...");
  const reviewBtn = page.locator("button:has-text('Review solution')");
  if (await reviewBtn.count() > 0) {
    await reviewBtn.first().click();
    await page.waitForTimeout(1000);
    const shotModal = path.join(artifactDir, "meta-events-review-solution-modal.png");
    await page.screenshot({ path: shotModal });
    console.log("Saved:", shotModal);
    const closeBtn = page.locator("button:has-text('Close')");
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click();
      await page.waitForTimeout(500);
    }
  }

  // 5. Events Manager Test Events Tab
  console.log("Capturing Events Manager Test Events Tab...");
  await page.goto("http://localhost:3001/admin/meta/events?tab=test-events", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const shotTestEvents = path.join(artifactDir, "meta-events-test-events-tab.png");
  await page.screenshot({ path: shotTestEvents });
  console.log("Saved:", shotTestEvents);

  await browser.close();
  console.log("All visual verification captures complete!");
}

run().catch((err) => {
  console.error("Error in capture script:", err);
  process.exit(1);
});
