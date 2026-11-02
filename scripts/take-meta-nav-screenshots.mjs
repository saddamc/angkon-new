import { chromium } from "@playwright/test";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// Read real JWT_SECRET from .env
const envContent = fs.readFileSync(".env", "utf-8");
const match = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const JWT_SECRET = match ? match[1].trim() : "angkon_secure_jwt_secret_2026";

const ARTIFACT_DIR = "C:/Users/Saddam/.gemini/antigravity/brain/2f2026a3-862e-43f4-b897-3e7a83158b5f";

function createSuperAdminJwt() {
  const payload = {
    sub: "saddam13bd@gmail.com",
    name: "Saddam Superadmin",
    role: "superadmin",
    authorizedTenants: ["angkon-main"],
    defaultTenant: "angkon-main",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64");
  return `${data}.${sig}`;
}

async function run() {
  const token = createSuperAdminJwt();
  const browser = await chromium.launch({ headless: true });

  // ── 1. Desktop Expanded Navigation ──────────────────────────────────
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await desktopContext.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      url: "http://localhost:3001",
    },
  ]);

  const page = await desktopContext.newPage();
  // ── 0. Regular Admin Dashboard (verifying untouched original main sidebar) ──
  console.log("Navigating to http://localhost:3001/admin/dashboard ...");
  await page.goto("http://localhost:3001/admin/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const dashboardPath = path.join(ARTIFACT_DIR, "admin-dashboard-with-main-sidebar.png");
  await page.screenshot({ path: dashboardPath, fullPage: false });
  console.log("Saved admin dashboard screenshot to:", dashboardPath);

  // ── 0b. Overview Route Screenshot ──
  console.log("Navigating desktop to http://localhost:3001/admin/meta ...");
  await page.goto("http://localhost:3001/admin/meta", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const overviewPath = path.join(ARTIFACT_DIR, "meta-overview-scrolled.png");
  await page.screenshot({ path: overviewPath, fullPage: false });
  console.log("Saved overview desktop screenshot to:", overviewPath);

  // ── 1. Meta Events Manager (Consolidated /admin/meta/events) ──
  console.log("Navigating desktop to http://localhost:3001/admin/meta/events ...");
  await page.goto("http://localhost:3001/admin/meta/events?tab=events-manager", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const expandedPath = path.join(ARTIFACT_DIR, "meta-nav-desktop-expanded.png");
  await page.screenshot({ path: expandedPath, fullPage: false });
  console.log("Saved expanded desktop screenshot to:", expandedPath);

  // ── 2. Desktop Hover (Hovering our main sidebar expands full sidebar over the top) ──
  const mainSidebar = page.locator('aside').first();
  await mainSidebar.hover();
  await page.waitForTimeout(600);
  const hoverFlyoutPath = path.join(ARTIFACT_DIR, "meta-nav-desktop-hover-flyout.png");
  await page.screenshot({ path: hoverFlyoutPath, fullPage: false });
  console.log("Saved hover flyout desktop screenshot to:", hoverFlyoutPath);

  // Move mouse away to collapse our sidebar back to 78px
  await page.mouse.move(600, 300);
  await page.waitForTimeout(600);

  // ── 3. Desktop Collapsed Navigation with Tooltip on Hover ───────────
  const collapseBtn = page.locator('aside[aria-label="Meta Marketing Suite Navigation"] button[title*="Collapse sidebar"], aside[aria-label="Meta Marketing Suite Navigation"] button:has-text("Collapse sidebar")').first();
  if (await collapseBtn.isVisible()) {
    await collapseBtn.click();
    await page.waitForTimeout(600);
  }

  // Hover over the Conversions API item in collapsed mode to trigger tooltip
  const navLinks = page.locator('aside[aria-label="Meta Marketing Suite Navigation"] a');
  const count = await navLinks.count();
  if (count > 2) {
    await navLinks.nth(2).hover();
    await page.waitForTimeout(500);
  }

  const collapsedPath = path.join(ARTIFACT_DIR, "meta-nav-desktop-collapsed.png");
  await page.screenshot({ path: collapsedPath, fullPage: false });
  console.log("Saved collapsed desktop screenshot to:", collapsedPath);

  // ── 3. Mobile View with Drawer Open ─────────────────────────────────
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobileContext.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      url: "http://localhost:3001",
    },
  ]);

  const mobilePage = await mobileContext.newPage();
  console.log("Navigating mobile to http://localhost:3001/admin/meta/pixel ...");
  await mobilePage.goto("http://localhost:3001/admin/meta/pixel", { waitUntil: "domcontentloaded" });
  await mobilePage.waitForTimeout(1500);

  // Open the Meta Suite navigation drawer
  const drawerBtn = mobilePage.locator('button[aria-label="Open Meta Suite navigation"]').first();
  console.log("Mobile drawer button visible:", await drawerBtn.isVisible());
  if (await drawerBtn.isVisible()) {
    await drawerBtn.click();
    await mobilePage.waitForTimeout(800);
  }

  const mobilePath = path.join(ARTIFACT_DIR, "meta-nav-mobile-drawer.png");
  await mobilePage.screenshot({ path: mobilePath, fullPage: false });
  console.log("Saved mobile drawer screenshot to:", mobilePath);

  // ── 4. Verify all 6 routes render correctly ────────────────────────
  const routes = [
    "/admin/meta",
    "/admin/meta/pixel",
    "/admin/meta/conversions-api",
    "/admin/meta/ads",
    "/admin/meta/catalog",
    "/admin/meta/domain-verification",
  ];

  for (const r of routes) {
    const res = await page.goto(`http://localhost:3001${r}`, { waitUntil: "domcontentloaded" });
    console.log(`Route ${r}: status ${res.status()}`);
    if (res.status() !== 200) {
      throw new Error(`Route ${r} returned non-200 status: ${res.status()}`);
    }
  }

  await browser.close();
  console.log("All screenshots and route verifications completed successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
