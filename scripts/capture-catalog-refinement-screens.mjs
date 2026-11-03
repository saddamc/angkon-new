import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const envContent = fs.readFileSync(".env", "utf-8");
const match = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const secret = match ? match[1].trim() : "angkon_secure_jwt_secret_2026";
const ARTIFACT_DIR = path.resolve("C:/Users/Saddam/.gemini/antigravity/brain/2f2026a3-862e-43f4-b897-3e7a83158b5f");

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
  const b = btoa(JSON.stringify(payload));
  const data = `${header}.${b}`;
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

async function main() {
  const token = await createSuperadminToken();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  await context.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
  ]);

  const page = await context.newPage();

  // 1. Capture Catalog Operations Dashboard
  console.log("Navigating to /admin/meta/catalog...");
  await page.goto("http://localhost:3001/admin/meta/catalog", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);

  const catalogDashboardPath = path.join(ARTIFACT_DIR, "meta-catalog-operations-dashboard.png");
  await page.screenshot({ path: catalogDashboardPath, fullPage: true });
  console.log("Captured:", catalogDashboardPath);

  // 2. Open Product Detail Drawer by clicking first row
  console.log("Locating product table rows...");
  try {
    await page.waitForSelector("tbody tr", { timeout: 8000 });
    const firstRow = page.locator("tbody tr").first();
    if (await firstRow.isVisible()) {
      console.log("Clicking product row to open drawer...");
      await firstRow.click();
      await page.waitForTimeout(1500);

      const drawerPath = path.join(ARTIFACT_DIR, "meta-catalog-product-detail-drawer.png");
      await page.screenshot({ path: drawerPath, fullPage: false });
      console.log("Captured:", drawerPath);

      // Click 'Pixel & CAPI Alignment' tab in drawer
      const alignmentTab = page.locator("button:has-text('Pixel & CAPI Alignment')");
      if (await alignmentTab.isVisible()) {
        await alignmentTab.click();
        await page.waitForTimeout(1000);
        const alignPath = path.join(ARTIFACT_DIR, "meta-catalog-alignment-drawer-tab.png");
        await page.screenshot({ path: alignPath, fullPage: false });
        console.log("Captured:", alignPath);
      }

      // Click 'Emitted XML Tag' tab in drawer
      const xmlTab = page.locator("button:has-text('Emitted XML Tag')");
      if (await xmlTab.isVisible()) {
        await xmlTab.click();
        await page.waitForTimeout(1000);
        const xmlPath = path.join(ARTIFACT_DIR, "meta-catalog-drawer-xml-tab.png");
        await page.screenshot({ path: xmlPath, fullPage: false });
        console.log("Captured:", xmlPath);
      }

      // Close drawer
      const closeBtn = page.locator("button:has-text('Close Drawer')");
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(800);
      }
    }
  } catch (err) {
    console.warn("Could not click product row:", err.message);
  }

  // 3. Navigate to Centralized Suite Settings Section 5
  console.log("Navigating to /admin/meta/settings?section=catalog...");
  await page.goto("http://localhost:3001/admin/meta/settings?section=catalog", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(3000);

  const settingsCatalogPath = path.join(ARTIFACT_DIR, "meta-settings-section-catalog-refined.png");
  await page.screenshot({ path: settingsCatalogPath, fullPage: false });
  console.log("Captured:", settingsCatalogPath);

  // 4. Open Edit Catalog ID Modal
  console.log("Opening Edit Catalog ID Modal...");
  const editIdBtn = page.locator("button:has-text('Edit ID')");
  if (await editIdBtn.isVisible()) {
    await editIdBtn.click();
    await page.waitForTimeout(1000);

    const modalPath = path.join(ARTIFACT_DIR, "meta-settings-edit-catalog-id-modal.png");
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log("Captured:", modalPath);

    const cancelBtn = page.locator("button:has-text('Cancel')").last();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(800);
    }
  }

  // 5. Open Configure Feed Schedule Modal
  console.log("Opening Configure Feed Schedule Modal...");
  const scheduleBtn = page.locator("button:has-text('Configure Schedule (Dialog)')");
  if (await scheduleBtn.isVisible()) {
    await scheduleBtn.click();
    await page.waitForTimeout(1000);

    const schedModalPath = path.join(ARTIFACT_DIR, "meta-settings-feed-schedule-modal.png");
    await page.screenshot({ path: schedModalPath, fullPage: false });
    console.log("Captured:", schedModalPath);

    const cancelBtn = page.locator("button:has-text('Cancel')").last();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(800);
    }
  }

  // 6. Navigate to /admin/meta/events?tab=settings to verify full width
  console.log("Navigating to /admin/meta/events?tab=settings...");
  await page.goto("http://localhost:3001/admin/meta/events?tab=settings", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(3000);

  const eventsSettingsPath = path.join(ARTIFACT_DIR, "meta-events-settings-tab-fullwidth.png");
  await page.screenshot({ path: eventsSettingsPath, fullPage: false });
  console.log("Captured:", eventsSettingsPath);

  await browser.close();
  console.log("All screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
