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

  console.log("\n================ CENTRALIZED SETTINGS API AUDIT ================");

  // 1. GET /api/admin/meta/settings
  const getRes = await fetch("http://localhost:3001/api/admin/meta/settings", {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  console.log("GET /api/admin/meta/settings Status:", getRes.status);
  const getJson = await getRes.json();
  console.log("Catalog Section:", JSON.stringify(getJson.catalog, null, 2));
  console.log("Domain Section:", JSON.stringify(getJson.domain, null, 2));

  // 2. POST /api/admin/meta/settings for catalog
  const postCatalogRes = await fetch("http://localhost:3001/api/admin/meta/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `nb_admin_token=${token}`,
    },
    body: JSON.stringify({
      section: "catalog",
      data: {
        catalogId: "1112170671558899",
      },
    }),
  });
  console.log("POST /api/admin/meta/settings (catalog) Status:", postCatalogRes.status);
  const postCatalogJson = await postCatalogRes.json();
  console.log("Catalog update result:", postCatalogJson);

  // 3. POST /api/admin/meta/settings for domain
  const postDomainRes = await fetch("http://localhost:3001/api/admin/meta/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `nb_admin_token=${token}`,
    },
    body: JSON.stringify({
      section: "domain",
      data: {
        domainVerificationToken: "c82us1ogm8zgy1u7zn8v7dcvzpt1a2",
        verificationMethod: "dns_txt",
      },
    }),
  });
  console.log("POST /api/admin/meta/settings (domain) Status:", postDomainRes.status);
  const postDomainJson = await postDomainRes.json();
  console.log("Domain update result:", postDomainJson);

  console.log("\n================ VISUAL CAPTURE ================");

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

  // Shot 1: Events Manager settings tab forwarding card
  console.log("Capturing Events Manager tab=settings...");
  await page.goto("http://localhost:3001/admin/meta/events?tab=settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotEventsSettings = path.join(artifactDir, "meta-events-settings-tab-unified.png");
  await page.screenshot({ path: shotEventsSettings, fullPage: false });
  console.log("Saved:", shotEventsSettings);

  // Shot 2: Centralized Settings with ?section=dataset
  console.log("Capturing Centralized Settings ?section=dataset...");
  await page.goto("http://localhost:3001/admin/meta/settings?section=dataset", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotSettingsDataset = path.join(artifactDir, "meta-settings-section-dataset.png");
  await page.screenshot({ path: shotSettingsDataset, fullPage: false });
  console.log("Saved:", shotSettingsDataset);

  // Shot 3: Centralized Settings with ?section=ads
  console.log("Capturing Centralized Settings ?section=ads...");
  await page.goto("http://localhost:3001/admin/meta/settings?section=ads", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const shotSettingsAds = path.join(artifactDir, "meta-settings-section-ads.png");
  await page.screenshot({ path: shotSettingsAds, fullPage: false });
  console.log("Saved:", shotSettingsAds);

  // Shot 4: Ads page streamlined status card
  console.log("Capturing Ads page streamlined status card...");
  await page.goto("http://localhost:3001/admin/meta/ads", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotAdsStreamlined = path.join(artifactDir, "meta-ads-streamlined-card.png");
  await page.screenshot({ path: shotAdsStreamlined, fullPage: false });
  console.log("Saved:", shotAdsStreamlined);

  // Shot 5: Catalog page centralized forwarder banner
  console.log("Capturing Catalog page forwarder banner...");
  await page.goto("http://localhost:3001/admin/meta/catalog", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotCatalogForwarder = path.join(artifactDir, "meta-catalog-forwarder-banner.png");
  await page.screenshot({ path: shotCatalogForwarder, fullPage: false });
  console.log("Saved:", shotCatalogForwarder);

  // Shot 6: Domain verification page forwarder banner
  console.log("Capturing Domain Verification page forwarder banner...");
  await page.goto("http://localhost:3001/admin/meta/domain-verification", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotDomainForwarder = path.join(artifactDir, "meta-domain-forwarder-banner.png");
  await page.screenshot({ path: shotDomainForwarder, fullPage: false });
  console.log("Saved:", shotDomainForwarder);

  await browser.close();
  console.log("All captures completed successfully!");
}

run().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});