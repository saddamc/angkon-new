import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const secret = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";
const artifactDir = "C:\\Users\\Saddam\\.gemini\\antigravity\\brain\\2f2026a3-862e-43f4-b897-3e7a83158b5f";

async function createSuperadminToken() {
  const payload = {
    sub: "admin",
    role: "superadmin",
    authorizedTenants: ["primary_store"],
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
  console.log("Generated SuperAdmin Token");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  console.log("Navigating to http://localhost:3001/admin/meta...");
  await page.goto("http://localhost:3001/admin/meta", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1500);

  const shot1 = path.join(artifactDir, "meta-background-calibrated-overview.png");
  await page.screenshot({ path: shot1, fullPage: false });
  console.log("Saved screenshot:", shot1);

  // Scroll down to capture performance chart and dual ledger
  await page.evaluate(() => {
    const scrollEl = document.getElementById("meta-canvas-scroll");
    if (scrollEl) {
      scrollEl.scrollTop = 900;
    }
  });
  await page.waitForTimeout(800);
  const shot2 = path.join(artifactDir, "meta-background-calibrated-scrolled.png");
  await page.screenshot({ path: shot2, fullPage: false });
  console.log("Saved screenshot:", shot2);

  // Navigate to Events Manager
  console.log("Navigating to http://localhost:3001/admin/meta/events...");
  await page.goto("http://localhost:3001/admin/meta/events", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1500);
  const shot3 = path.join(artifactDir, "meta-background-calibrated-events.png");
  await page.screenshot({ path: shot3, fullPage: false });
  console.log("Saved screenshot:", shot3);

  // Mobile viewport test
  console.log("Testing mobile viewport 390x844...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobileContext.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3001/admin/meta", { waitUntil: "networkidle", timeout: 20000 });
  await mobilePage.waitForTimeout(1500);
  const shot4 = path.join(artifactDir, "meta-background-calibrated-mobile.png");
  await mobilePage.screenshot({ path: shot4, fullPage: false });
  console.log("Saved screenshot:", shot4);

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
