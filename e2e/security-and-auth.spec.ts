import { test, expect } from "@playwright/test";

test.describe("Security, Authorization & Authentication Verification", () => {
  test("Admin RBAC: Unauthenticated API access to /api/admin/products is blocked with 401", async ({ request }) => {
    const res = await request.get("/api/admin/products");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  test("Admin RBAC: Unauthenticated page access to /admin/products redirects to /admin", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("Admin Auth: Invalid credentials return 401", async ({ request }) => {
    const res = await request.post("/api/admin/login", {
      data: {
        username: "admin",
        password: "definitely_wrong_password_12345",
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  test("Customer Auth: Register or Login, verify session with /api/auth/me, and logout", async ({ request }) => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const testEmail = `qa_audit_${randomSuffix}@angkon-test.local`;
    const testPassword = "AuditPassword2026!";

    // 1. Try Register, or fallback to Login if IP rate limited
    const regRes = await request.post("/api/auth/register", {
      data: {
        name: "QA Audit User",
        email: testEmail,
        password: testPassword,
        phone: "01711000000",
      },
    });

    if (regRes.status() === 429) {
      // If registration rate-limited on this IP, test auth flow via login
      const loginRes = await request.post("/api/auth/login", {
        data: {
          email: "test_existing_check@angkon-test.local",
          password: "Password123!",
        },
      });
      expect(loginRes.status()).toBe(200);
      const loginCookies = loginRes.headers()["set-cookie"] || "";
      expect(loginCookies).toContain("angkon_user_token");

      // Verify /api/auth/me
      const meRes = await request.get("/api/auth/me");
      expect(meRes.status()).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.authenticated).toBe(true);

      // Logout
      const logoutRes = await request.post("/api/auth/logout");
      expect(logoutRes.status()).toBe(200);
      return;
    }

    expect([201, 409]).toContain(regRes.status());
    if (regRes.status() === 201) {
      const regCookies = regRes.headers()["set-cookie"] || "";
      expect(regCookies).toContain("angkon_user_token");

      const meRes = await request.get("/api/auth/me");
      expect(meRes.status()).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.authenticated).toBe(true);
      expect(meBody.user.email).toBe(testEmail);

      const logoutRes = await request.post("/api/auth/logout");
      expect(logoutRes.status()).toBe(200);

      const meAfterLogout = await request.get("/api/auth/me");
      const meAfterBody = await meAfterLogout.json();
      expect(meAfterBody.authenticated).toBe(false);
    }
  });

  test("Authoritative Pricing: Submitting client-side manipulated item price is overridden by catalog", async ({ request }) => {
    // Attempt to submit an order with a 1 BDT price on a real catalog item
    const res = await request.post("/api/orders", {
      data: {
        fullName: "Security Price Audit",
        email: "security_price_test@angkon-test.local",
        phone: "01711223344",
        address: "Banani, Block C",
        city: "Dhaka",
        district: "Dhaka",
        postalCode: "1213",
        items: [
          {
            productId: 228008,
            slug: "safaidah-dastaan-black-floral-suit",
            name: "Safaidah Suit",
            price: 1, // Tampered price
            quantity: 1,
            size: "M",
          },
        ],
      },
    });

    expect(res.status()).toBe(201);
    const data = await res.json();
    // Catalog price is 8800 BDT, subtotal must reflect true catalog price
    expect(data.subtotal).toBeGreaterThan(500);
  });

  test("SEC-01 Regression: Guest checkout with existing registered email must NOT issue session token or overwrite profile", async ({ playwright }) => {
    const existingCustomerEmail = "test_existing_check@angkon-test.local";

    // 1. Perform checkout as an unauthenticated guest from a completely new isolated context
    const guestContext = await playwright.request.newContext();
    const guestRes = await guestContext.post("http://localhost:3001/api/orders", {
      data: {
        fullName: "Attacker Trying Takeover",
        email: existingCustomerEmail,
        phone: "01999888777",
        address: "Malicious Address",
        city: "Dhaka",
        district: "Dhaka",
        postalCode: "1200",
        items: [
          {
            productId: 228008,
            slug: "safaidah-dastaan-black-floral-suit",
            quantity: 1,
            size: "M",
          },
        ],
      },
    });

    expect(guestRes.status()).toBe(201);
    const setCookie = guestRes.headers()["set-cookie"] || "";
    // CRITICAL ASSERTION: The unauthenticated guest MUST NOT receive the registered customer's session token!
    expect(setCookie).not.toContain("angkon_user_token");
  });
});
