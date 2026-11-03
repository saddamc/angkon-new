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
    viewport: { width: 1440, height: 960 },
  });

  await context.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      url: "http://localhost:3001",
    },
  ]);

  const page = await context.newPage();

  // 1. Events Manager Overview Tab (Redesigned with Compact EMQ Strip & 8-column Table)
  console.log("1. Capturing Events Manager Overview Redesign...");
  await page.goto("http://localhost:3001/admin/meta/events", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotOverview = path.join(artifactDir, "meta-events-overview-redesign.png");
  await page.screenshot({ path: shotOverview, fullPage: false });
  console.log("Saved:", shotOverview);

  // 2. Integrations Tab with 3-Column Architecture Diagram
  console.log("2. Capturing Integrations Visual Architecture Diagram...");
  await page.goto("http://localhost:3001/admin/meta/events?tab=integrations", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotIntegrations = path.join(artifactDir, "meta-events-integrations-architecture.png");
  await page.screenshot({ path: shotIntegrations, fullPage: false });
  console.log("Saved:", shotIntegrations);

  // 3. Open Event Detail Drawer for Purchase Event
  console.log("3. Opening Event Detail Drawer for Purchase Event...");
  await page.goto("http://localhost:3001/admin/meta/events", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Click on Purchase row's Details button
  const purchaseRow = page.locator("tr:has-text('Purchase')");
  if (await purchaseRow.count() > 0) {
    const detailsBtn = purchaseRow.locator("button:has-text('Details')");
    if (await detailsBtn.count() > 0) {
      await detailsBtn.first().click();
    } else {
      await purchaseRow.first().click();
    }
    await page.waitForTimeout(1000);

    // Capture Drawer Overview tab
    const shotDrawerOverview = path.join(artifactDir, "meta-events-purchase-drawer-overview.png");
    await page.screenshot({ path: shotDrawerOverview });
    console.log("Saved:", shotDrawerOverview);

    // Switch to Event Match Quality tab
    const emqTab = page.locator("button:has-text('Event Match Quality')").last();
    if (await emqTab.count() > 0) {
      await emqTab.click();
      await page.waitForTimeout(600);
      const shotDrawerEmq = path.join(artifactDir, "meta-events-purchase-drawer-emq.png");
      await page.screenshot({ path: shotDrawerEmq });
      console.log("Saved:", shotDrawerEmq);
    }

    // Switch to Diagnostics tab
    const diagTab = page.locator("button:has-text('Diagnostics')").last();
    if (await diagTab.count() > 0) {
      await diagTab.click();
      await page.waitForTimeout(600);
      const shotDrawerDiag = path.join(artifactDir, "meta-events-purchase-drawer-diagnostics.png");
      await page.screenshot({ path: shotDrawerDiag });
      console.log("Saved:", shotDrawerDiag);
    }
  } else {
    console.warn("Warning: Purchase row not found in table");
  }

  await browser.close();
  console.log("Visual capture complete!");
}

run().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
