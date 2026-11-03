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
    tenantId: "angkon-main",
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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  const token = await createSuperadminToken();
  await context.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
    {
      name: "admin_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
    {
      name: "tenant_id",
      value: "angkon-main",
      domain: "localhost",
      path: "/",
    },
  ]);

  const page = await context.newPage();

  console.log("Navigating to Domain Verification dashboard...");
  await page.goto("http://localhost:3001/admin/meta/domain-verification", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);

  // 1. Full Dashboard Overview Screenshot (entire scrollable length)
  const fullPagePath = path.join(ARTIFACT_DIR, "meta-domain-fullpage.png");
  await page.screenshot({ path: fullPagePath, fullPage: true });
  console.log("Saved full page:", fullPagePath);

  // 2. Open Technical Details (Snippets & Records)
  console.log("Opening technical snippets & examined records...");
  const toggleBtn = page.locator("button:has-text('Show Snippets & Records')");
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForTimeout(1000);
    const techDetailsPath = path.join(ARTIFACT_DIR, "meta-domain-technical-details.png");
    await page.screenshot({ path: techDetailsPath, fullPage: true });
    console.log("Saved:", techDetailsPath);
  }

  // 3. Scroll to AEM & Audit Section
  console.log("Capturing AEM & Audit Section...");
  const aemHeading = page.locator("h2:has-text('Aggregated Event Measurement')");
  if (await aemHeading.isVisible()) {
    await aemHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const aemSectionPath = path.join(ARTIFACT_DIR, "meta-domain-aem-audit-section.png");
    await page.screenshot({ path: aemSectionPath, fullPage: false });
    console.log("Saved:", aemSectionPath);
  }

  // 4. Navigate to Centralized Suite Settings Section 6 (Domain)
  console.log("Navigating to Suite Settings Section 6 (Domain)...");
  await page.goto("http://localhost:3001/admin/meta/settings?section=domain", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);

  const section6Heading = page.locator("h2:has-text('6. Domain Verification & AEM')");
  if (await section6Heading.isVisible()) {
    await section6Heading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
  }
  const section6Path = path.join(ARTIFACT_DIR, "meta-settings-section-domain-refined.png");
  await page.screenshot({ path: section6Path, fullPage: false });
  console.log("Saved:", section6Path);

  // 5. Open Add Domain Modal
  console.log("Testing Add Domain Modal...");
  const addDomainBtn = page.locator("button:has-text('+ Add Domain (Dialog)')");
  if (await addDomainBtn.isVisible()) {
    await addDomainBtn.click();
    await page.waitForTimeout(1000);
    const addDomainModalPath = path.join(ARTIFACT_DIR, "meta-settings-add-domain-modal.png");
    await page.screenshot({ path: addDomainModalPath, fullPage: false });
    console.log("Saved:", addDomainModalPath);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 6. Open AEM Priority Configuration Modal
  console.log("Testing Configure AEM Priority Modal...");
  const aemBtn = page.locator("button:has-text('Configure AEM (Dialog)')");
  if (await aemBtn.isVisible()) {
    await aemBtn.click();
    await page.waitForTimeout(1000);
    const aemModalPath = path.join(ARTIFACT_DIR, "meta-settings-aem-modal.png");
    await page.screenshot({ path: aemModalPath, fullPage: false });
    console.log("Saved:", aemModalPath);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  await browser.close();
  console.log("All Playwright captures completed successfully.");
}

main().catch((err) => {
  console.error("Playwright capture error:", err);
  process.exit(1);
});
