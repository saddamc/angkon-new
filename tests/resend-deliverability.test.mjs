/**
 * Resend deliverability contract.
 *
 * Protects against the two Resend Insights warnings seen in the email event:
 * no-reply sender, and email CTAs pointing at a host other than the verified
 * sending domain. Also confirms that customers can reply to the configured
 * support inbox.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const resend = read("src/lib/email/resend.ts");
const auth = read("src/server/auth.ts");
const account = read("src/server/account.ts");
const envExample = read(".env.example");
const integrations = read("src/app/api/admin/integrations/status/route.ts");

test("default sender is human-replyable, not no-reply", () => {
  assert.ok(
    resend.includes('"ANGKON Orders <orders@angkon.net>"'),
    "default sender must be orders@angkon.net on the verified sending domain"
  );
  assert.ok(
    !resend.includes("noreply@angkon.net"),
    "no-reply must not be used as the fallback sender"
  );
  assert.ok(
    integrations.includes("ANGKON Orders <orders@angkon.net>"),
    "the admin integrations health card must show the same fallback sender"
  );
});

test("Resend sends the configured support Reply-To address", () => {
  assert.ok(resend.includes("EMAIL_REPLY_TO"), "Reply-To must be configurable by environment");
  assert.ok(resend.includes("reply_to: configuredReplyTo"), "Resend payload must contain reply_to");
  assert.ok(envExample.includes("EMAIL_REPLY_TO=contact@angkon.com.bd"));
});

test("verification and password-reset links use the verified sender-domain origin", () => {
  assert.ok(auth.includes("export function getEmailSiteUrl()"));
  assert.ok(auth.includes('return "https://angkon.net";'));
  assert.ok(account.includes("getEmailSiteUrl()}/api/auth/verify"));
  assert.ok(account.includes("getEmailSiteUrl()}/my-account/reset-password"));
  assert.ok(envExample.includes("EMAIL_SITE_URL=https://angkon.net"));
});

test("email URL configuration cannot redirect to localhost or an unverified host", () => {
  assert.ok(auth.includes("host === \"angkon.net\" || host === \"www.angkon.net\""));
  assert.ok(auth.includes('url.protocol === "https:"'));
  assert.ok(
    !account.includes("getSiteUrl(request)"),
    "email links must not inherit a localhost, preview, or untrusted request Host header"
  );
});
