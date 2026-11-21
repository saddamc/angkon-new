import { chromium } from "playwright";
import dotenv from "dotenv";
import path from "node:path";
import crypto from "node:crypto";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const secret =
  process.env.JWT_SECRET?.trim() || "angkon_local_dev_only_jwt_secret_change_me";

async function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = Buffer.from(sig).toString("base64");
  return `${data}.${sigB64}`;
}

async function main() {
  const token = await signToken({
    sub: "admin",
    name: "Super Admin",
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + 86400,
    authorizedTenants: ["angkon-main"],
    defaultTenant: "angkon-main",
  });

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
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  console.log("Navigating to http://localhost:3001/admin/orders...");
  await page.goto("http://localhost:3001/admin/orders", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const artifactDir = "C:/Users/Saddam/.gemini/antigravity/brain/2f8a3e1a-30bc-4022-9384-86142546931f";

  // Screenshot 1: Main Orders page with Steadfast Account Balance & Payment Issues KPI
  const screen1Path = path.join(artifactDir, "10-orders-operations-dashboard.png");
  await page.screenshot({ path: screen1Path });
  console.log("Saved Screenshot 1:", screen1Path);

  // Click on "Needs Action" tab
  const needsActionBtn = page.getByRole("button", { name: /Needs Action/i });
  if (await needsActionBtn.count()) {
    await needsActionBtn.first().click();
    await page.waitForTimeout(1500);
    const screen2Path = path.join(artifactDir, "11-orders-needs-action-view.png");
    await page.screenshot({ path: screen2Path });
    console.log("Saved Screenshot 2:", screen2Path);
  }

  // Go back to All Orders and select the first checkbox
  const allOrdersBtn = page.getByRole("button", { name: /All Orders/i });
  if (await allOrdersBtn.count()) {
    await allOrdersBtn.first().click();
    await page.waitForTimeout(1000);
  }

  const checkboxes = page.locator("input[type='checkbox']");
  if ((await checkboxes.count()) > 1) {
    // Select first order
    await checkboxes.nth(1).click();
    await page.waitForTimeout(500);

    // Click "Send to Steadfast"
    const bulkSendBtn = page.getByRole("button", { name: /Send to Steadfast/i });
    if (await bulkSendBtn.count()) {
      await bulkSendBtn.first().click();
      await page.waitForTimeout(1000);
      const screen3Path = path.join(artifactDir, "12-bulk-booking-preview-modal.png");
      await page.screenshot({ path: screen3Path });
      console.log("Saved Screenshot 3:", screen3Path);
    }
  }

  await browser.close();
  console.log("Verification screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
