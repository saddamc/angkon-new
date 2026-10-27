import { test, expect, type Page } from "@playwright/test";
import { generateCode, hashCode, isWellFormedCode } from "../src/server/email-code";
import { addFirstProductToCart, suppressPromoPopup } from "./helpers";

/* ── Pure helpers ─────────────────────────────────────────────────────── */

test.describe("email code helpers", () => {
  test("codes are 6 digits and well-formedness is strict", () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^[0-9]{6}$/);
    expect(isWellFormedCode("012345")).toBe(true);
    for (const bad of ["12345", "1234567", "12345a", "12 456", "", null, undefined, 123456]) {
      expect(isWellFormedCode(bad)).toBe(false);
    }
  });

  test("a code is stored as a hash that depends on the email", () => {
    const a = hashCode("a@example.com", "123456");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("123456");
    expect(hashCode("a@example.com", "123456")).toBe(a);
    expect(hashCode("b@example.com", "123456")).not.toBe(a);
    expect(hashCode("a@example.com", "654321")).not.toBe(a);
  });
});

/* ── API (read-only / rejected requests — nothing is sent or saved) ───── */

test.describe("verification API", () => {
  test("asking for a code needs a valid email", async ({ request }) => {
    const res = await request.post("/api/auth/email-code/send", { data: { email: "not-an-email" } });
    expect(res.status()).toBe(400);
  });

  test("checking a code needs a well-formed code", async ({ request }) => {
    const res = await request.post("/api/auth/email-code/verify", { data: { email: "someone@example.com", code: "12ab56" } });
    expect(res.status()).toBe(400);
  });

  test("a code that was never issued is reported as expired", async ({ request }) => {
    const res = await request.post("/api/auth/email-code/verify", {
      data: { email: `nobody-${Date.now()}@example.com`, code: "123456" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("EXPIRED");
  });

  test("checkout config reports the setting and who is signed in", async ({ request }) => {
    const res = await request.get("/api/checkout/config");
    expect(res.ok()).toBeTruthy();
    const config = await res.json();
    expect(typeof config.requireEmailVerification).toBe("boolean");
    expect(config.user).toBeNull(); // the test client is not signed in
  });

  test("the admin switch can't be changed by the public", async ({ request }) => {
    const res = await request.post("/api/admin/settings/checkout", { data: { requireEmailVerification: false } });
    expect([401, 403]).toContain(res.status());
  });

  test("an order without a verified, signed-in email is refused (no order is created)", async ({ request }) => {
    const config = await (await request.get("/api/checkout/config")).json();
    test.skip(!config.requireEmailVerification, "Email verification is switched off in Admin → Settings → Checkout");

    const res = await request.post("/api/orders", {
      data: {
        fullName: "E2E Test",
        email: "e2e-test@example.com",
        phone: "01700000000",
        address: "1 Test Road",
        city: "Dhaka",
        district: "Dhaka",
        items: [{ productId: 228008, slug: "safaidah-dastaan-black-floral-suit", name: "Safaidah Suit", price: 8800, quantity: 1 }],
      },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_VERIFICATION_REQUIRED");
  });
});

/* ── Checkout screen, with email + order calls mocked ─────────────────── */

type Calls = { sent: number; verified: string[]; orders: { email: string }[] };

async function mockBackend(page: Page, opts: { signedInAs?: string } = {}): Promise<Calls> {
  const calls: Calls = { sent: 0, verified: [], orders: [] };
  const user = opts.signedInAs
    ? { name: "Verified Customer", email: opts.signedInAs, phone: "01700000000", emailVerified: true }
    : null;

  await page.route("**/api/checkout/config", (route) =>
    route.fulfill({ json: { requireEmailVerification: true, user } }),
  );
  await page.route("**/api/auth/email-code/send", (route) => {
    calls.sent++;
    return route.fulfill({ json: { ok: true, expiresInMinutes: 10, resendAfterSeconds: 60 } });
  });
  await page.route("**/api/auth/email-code/verify", async (route) => {
    const body = route.request().postDataJSON() as { email: string; code: string };
    calls.verified.push(body.code);
    if (body.code !== "123456") {
      return route.fulfill({ status: 400, json: { error: "That code isn't correct. 4 tries left.", code: "INVALID" } });
    }
    return route.fulfill({
      json: { ok: true, user: { id: "u1", name: "Verified Customer", email: body.email, phone: "", emailVerified: true } },
    });
  });
  await page.route("**/api/orders", async (route) => {
    const body = route.request().postDataJSON() as { email: string };
    calls.orders.push({ email: body.email });
    return route.fulfill({
      status: 201,
      json: {
        orderId: "ANG-000000-000",
        shippingFee: 60,
        account: { status: "signed_in", email: body.email, emailVerified: true },
      },
    });
  });
  return calls;
}

/** Open the checkout and wait until it has loaded its scripts (it asks for its config once ready). */
async function openCheckout(page: Page) {
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/checkout/config"), { timeout: 90_000 }),
    page.goto("/checkout"),
  ]);
  await expect(page.locator('[name="name"]')).toBeVisible();
}

async function fillCheckout(page: Page, email: string, withEmail = true) {
  await page.locator('[name="name"]').fill("Test Customer");
  await page.locator('[name="streetAddress"]').fill("12 Test Road");
  await page.locator('[name="city"]').fill("Dhaka");
  await page.locator('select[name="district"]').selectOption("Dhaka");
  await page.locator('[name="phone"]').fill("01712345678");
  if (withEmail) await page.locator('[name="email"]').fill(email);
}

test.describe("checkout email verification", () => {
  test.beforeEach(async ({ page }) => {
    await suppressPromoPopup(page);
  });

  test("verify with a code, get signed in, and the order is placed automatically", async ({ page }) => {
    const calls = await mockBackend(page);
    await addFirstProductToCart(page);
    await openCheckout(page);
    await fillCheckout(page, "buyer@example.com");

    await page.getByRole("button", { name: "Place order" }).click();

    const dialog = page.getByRole("dialog", { name: "Confirm your email" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("buyer@example.com");
    expect(calls.sent).toBe(1);
    expect(calls.orders).toHaveLength(0); // no order until the email is verified

    // A wrong code is rejected and the dialog stays open.
    await page.getByLabel("6-digit verification code").fill("111111");
    await expect(dialog.getByRole("alert")).toContainText("isn't correct");
    expect(calls.orders).toHaveLength(0);

    // The right code verifies, signs in, and places the order without another click.
    await page.getByLabel("6-digit verification code").fill("123456");
    await expect(page.getByRole("heading", { name: "Order Confirmed!" })).toBeVisible();
    await expect(page.getByText(/Email verified/)).toBeVisible();
    expect(calls.verified).toEqual(["111111", "123456"]);
    expect(calls.orders).toEqual([{ email: "buyer@example.com" }]);
  });

  test("closing the dialog to change the email places no order", async ({ page }) => {
    const calls = await mockBackend(page);
    await addFirstProductToCart(page);
    await openCheckout(page);
    await fillCheckout(page, "typo@example.com");

    await page.getByRole("button", { name: "Place order" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm your email" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Wrong email? Change it" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[name="email"]')).toHaveValue("typo@example.com");
    expect(calls.orders).toHaveLength(0);
  });

  test("a signed-in customer with a verified email is not asked again", async ({ page }) => {
    const calls = await mockBackend(page, { signedInAs: "member@example.com" });
    await addFirstProductToCart(page);
    await openCheckout(page);

    // Pre-filled from the account, and locked to the verified address.
    await expect(page.locator('[name="email"]')).toHaveValue("member@example.com");
    await expect(page.locator('[name="email"]')).toHaveAttribute("readonly", "");
    await expect(page.getByText("Verified — you're signed in.")).toBeVisible();

    await fillCheckout(page, "", false);
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByRole("heading", { name: "Order Confirmed!" })).toBeVisible();
    expect(calls.sent).toBe(0);
    expect(calls.orders).toEqual([{ email: "member@example.com" }]);
  });
});
