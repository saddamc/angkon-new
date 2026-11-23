/**
 * Customer invoice printing & verification-email honesty contracts.
 *
 * 1. Invoice print: the my-account invoice must print as a complete,
 *    single-flow A4 sheet — exactly as many pages as the invoice needs,
 *    never clipped by the dialog, never padded with blank pages, and no
 *    white-on-white / light-on-white text.
 * 2. Registration must tell the customer the truth when the verification
 *    email could not be dispatched.
 * 3. My Account must offer verify-by-code (the same 6-digit codes checkout
 *    sends) so a customer holding a code is never stuck waiting for a link.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const accountPage = read("src/app/my-account/page.tsx");
const registerRoute = read("src/app/api/auth/register/route.ts");

// ── 1. INVOICE PRINTING ────────────────────────────────────────────────────

test("invoice modal portals to <body> so print can isolate it completely", () => {
  assert.ok(
    accountPage.includes("createPortal"),
    "the invoice modal must portal to document.body"
  );
  assert.ok(
    accountPage.includes("document.body\n  );") || accountPage.includes("document.body);") || accountPage.includes("document.body\n  );\n}"),
    "the portal target must be document.body"
  );
  assert.ok(
    accountPage.includes('document.body.classList.add("invoice-print-mode")'),
    "opening the modal must tag <body> for print isolation"
  );
  assert.ok(
    accountPage.includes('document.body.classList.remove("invoice-print-mode")'),
    "closing the modal must remove the print-mode tag (plain page prints stay intact)"
  );
});

test("invoice print uses display:none isolation — no visibility layout pages", () => {
  assert.ok(
    accountPage.includes("body.invoice-print-mode > *:not(#angkon-invoice-backdrop)"),
    "everything except the invoice sheet is display:none in print (visibility:hidden kept layout and produced blank pages)"
  );
  assert.ok(
    !accountPage.includes("body * {"),
    "the old visibility:hidden hack must be gone"
  );
  assert.ok(
    accountPage.includes("max-height: none !important"),
    "the on-screen max-h-[82vh] scroll box must be removed in print"
  );
  assert.ok(
    accountPage.includes("overflow: visible !important"),
    "neither the card's overflow-hidden nor the sheet's overflow-y-auto may clip print output"
  );
  assert.ok(
    !accountPage.includes("position: absolute !important"),
    "the sheet must flow in normal print order (absolute positioning fragments poorly)"
  );
});

test("invoice print: uses a dedicated A4 page setup", () => {
  assert.ok(accountPage.includes("@page"), "print output must declare @page geometry");
  assert.ok(accountPage.includes("size: A4"), "the invoice prints on A4 paper");
});

test("invoice print: every dark-theme text utility maps to legible ink", () => {
  assert.ok(
    accountPage.includes("#angkon-printable-invoice .text-white"),
    "all .text-white elements must print dark (the old rule left 'Grand Total:' invisible)"
  );
  assert.ok(
    accountPage.includes(".text-green-400") && accountPage.includes("#15803d"),
    "PAID IN FULL must print as readable green ink, not screen-light green"
  );
  assert.ok(
    accountPage.includes(".text-amber-400") && accountPage.includes("#b45309"),
    "CASH ON DELIVERY / Balance Due must print as readable amber ink"
  );
  assert.ok(
    accountPage.includes("tbody tr") && accountPage.includes("#f3f4f6"),
    "line-item row separators must print light gray"
  );
  assert.ok(
    accountPage.includes("break-inside: avoid"),
    "a line item must never be split across two printed pages"
  );
  assert.ok(
    accountPage.includes(".no-print") && accountPage.includes('id="angkon-printable-invoice"'),
    "the print sheet id and the no-print chrome gate must both remain"
  );
});

// ── 2. VERIFICATION EMAIL HONESTY ─────────────────────────────────────────

test("registration reports whether the verification email was actually sent", () => {
  assert.ok(
    registerRoute.includes("let emailSent = true"),
    "register route tracks the real dispatch outcome"
  );
  assert.ok(
    registerRoute.includes("{ ok: true, user: publicUser(user), emailSent }"),
    "the 201 response includes emailSent so the UI never claims a send that failed"
  );
});

test("my-account surfaces the honest resend path when the email fails", () => {
  assert.ok(
    accountPage.includes("data.emailSent === false"),
    "the register success path must check the honest emailSent flag"
  );
  assert.ok(
    accountPage.includes("Verify with code"),
    "the failure notice points at a working recovery action"
  );
});

// ── 3. VERIFY-BY-CODE ON MY ACCOUNT ───────────────────────────────────────

test("my-account lets the customer verify with the emailed 6-digit code", () => {
  assert.ok(
    accountPage.includes("requestEmailCode"),
    "the banner must be able to email a code via the shared checkout helper"
  );
  assert.ok(
    accountPage.includes('"/api/auth/email-code/verify"'),
    "the code form must validate through the same endpoint checkout uses"
  );
  assert.ok(
    accountPage.includes("openCodeVerification"),
    "both the banner and the security tab expose the code flow"
  );
  assert.ok(
    accountPage.includes("autoComplete=\"one-time-code\""),
    "the code input must let browsers autofill the OTP"
  );
  assert.ok(
    accountPage.includes("digits.length === 6"),
    "the code auto-submits as soon as the 6th digit is entered"
  );
});

// ── 4. PASSWORD-LESS SIGN-IN FOR CHECKOUT-CREATED ACCOUNTS ────────────────

test("signed-out page offers Sign in with a code (checkout accounts have no password)", () => {
  assert.ok(
    accountPage.includes('"login" | "register" | "code"'),
    "the auth tab state must include the code sign-in mode"
  );
  assert.ok(
    accountPage.includes("Sign in with a code"),
    "the sign-in form must link to the password-less code flow"
  );
  assert.ok(
    accountPage.includes("sendSignInCode"),
    "the code sign-in form must be able to email a code to the entered address"
  );
  assert.ok(
    accountPage.includes("handleCodeSignIn"),
    "entering the code must sign the customer in"
  );
});

test("server hints point no-password accounts at the code sign-in", () => {
  const loginRoute = read("src/app/api/auth/login/route.ts");
  assert.ok(
    loginRoute.includes("Sign in with a code"),
    "the NO_PASSWORD login error must tell the customer about the code sign-in"
  );
  assert.ok(
    registerRoute.includes("Sign in with a code"),
    "the existing-account register error must point at the code sign-in too"
  );
});
