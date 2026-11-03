import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = path.resolve("C:/Users/Saddam/.gemini/antigravity/brain/2f2026a3-862e-43f4-b897-3e7a83158b5f");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  await context.addCookies([
    {
      name: "auth_token",
      value: "superadmin_mock_token_saddam",
      domain: "localhost",
      path: "/",
    },
    {
      name: "user_session",
      value: JSON.stringify({
        email: "saddam13bd@gmail.com",
        role: "super_admin",
        tenantId: "angkon-main",
      }),
      domain: "localhost",
      path: "/",
    },
  ]);

  const page = await context.newPage();

  // 1. Catalog Page & Open Drawer
  console.log("Navigating to /admin/meta/catalog...");
  await page.goto("http://localhost:3001/admin/meta/catalog", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  console.log("Waiting for product rows...");
  await page.waitForSelector("tbody tr", { timeout: 15000 });
  const rows = page.locator("tbody tr");
  const count = await rows.count();
  console.log(`Found ${count} product rows.`);

  if (count > 0) {
    console.log("Clicking first product row to open drawer...");
    await rows.first().click();
    await page.waitForTimeout(1500);

    const drawerPath = path.join(ARTIFACT_DIR, "meta-catalog-product-detail-drawer.png");
    await page.screenshot({ path: drawerPath, fullPage: false });
    console.log("Captured:", drawerPath);

    // Switch to 'Emitted XML Tag' tab
    const xmlTab = page.locator("button:has-text('Emitted XML Tag')");
    if (await xmlTab.isVisible()) {
      await xmlTab.click();
      await page.waitForTimeout(1000);
      const xmlPath = path.join(ARTIFACT_DIR, "meta-catalog-drawer-xml-tab.png");
      await page.screenshot({ path: xmlPath, fullPage: false });
      console.log("Captured:", xmlPath);
    }

    // Switch to 'Pixel & CAPI Alignment' tab
    const alignTab = page.locator("button:has-text('Pixel & CAPI Alignment')");
    if (await alignTab.isVisible()) {
      await alignTab.click();
      await page.waitForTimeout(1000);
      const alignPath = path.join(ARTIFACT_DIR, "meta-catalog-drawer-alignment-tab.png");
      await page.screenshot({ path: alignPath, fullPage: false });
      console.log("Captured:", alignPath);
    }
  }

  // 2. Settings Page Catalog Modals
  console.log("Navigating to /admin/meta/settings?section=catalog...");
  await page.goto("http://localhost:3001/admin/meta/settings?section=catalog", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(2000);

  // Open Edit ID Modal
  const editIdBtn = page.locator("button:has-text('Edit ID')");
  if (await editIdBtn.isVisible()) {
    console.log("Opening Edit Catalog ID Modal...");
    await editIdBtn.click();
    await page.waitForTimeout(1000);
    const modalPath = path.join(ARTIFACT_DIR, "meta-settings-edit-catalog-id-modal.png");
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log("Captured:", modalPath);

    const cancelBtn = page.locator("button:has-text('Cancel')").last();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
    await page.waitForTimeout(800);
  }

  // Open Configure Schedule Modal
  const schedBtn = page.locator("button:has-text('Configure Schedule (Dialog)')");
  if (await schedBtn.isVisible()) {
    console.log("Opening Feed Schedule Modal...");
    await schedBtn.click();
    await page.waitForTimeout(1000);
    const schedPath = path.join(ARTIFACT_DIR, "meta-settings-feed-schedule-modal.png");
    await page.screenshot({ path: schedPath, fullPage: false });
    console.log("Captured:", schedPath);

    const cancelBtn = page.locator("button:has-text('Cancel')").last();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  }

  await browser.close();
  console.log("Drawer and Modal screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
