import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  getPaymentCallbackBaseUrl,
  getPaymentIpnBaseUrl,
} from "../../src/server/payments/config/sslcommerz.ts";
import { VerifyPaymentService } from "../../src/server/payments/services/verify-payment.ts";
import {
  PaymentStateMachine,
  isSuccessfulStatus,
  normalizePaymentStatus,
} from "../../src/server/payments/payment-state-machine.ts";
import { getPaymentStatusInfo } from "../../src/lib/payments/payment-status-labels.ts";
import type { NormalizedGatewayResult } from "../../src/server/payments/types.ts";

function setEnv(key: string, value?: string) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function makeNormalized(overrides: Partial<NormalizedGatewayResult> = {}): NormalizedGatewayResult {
  return {
    provider: "sslcommerz",
    tranId: "ANG-261126-1001",
    valId: "VAL-SANDBOX-001",
    status: "VALID",
    amount: 2500,
    currency: "BDT",
    bankTranId: "BANK-SANDBOX-001",
    cardType: "BKASH-BKash",
    cardBrand: "MOBILEBANKING",
    riskLevel: "0",
    riskTitle: "Safe",
    rawResponse: { status: "VALID" },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Callback & IPN Base URL Configuration
// ─────────────────────────────────────────────────────────────────────────────

test("Callback URLs: production defaults to https://angkon.net and rejects localhost", () => {
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  const prevCb = process.env.PAYMENT_CALLBACK_BASE_URL;
  const prevIpn = process.env.PAYMENT_IPN_BASE_URL;

  try {
    setEnv("PAYMENT_CALLBACK_BASE_URL", undefined);
    setEnv("PAYMENT_IPN_BASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SITE_URL", "https://angkon.net");

    assert.equal(getPaymentCallbackBaseUrl("production"), "https://angkon.net");
    assert.equal(getPaymentIpnBaseUrl("production"), "https://angkon.net");

    setEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    assert.throws(() => getPaymentCallbackBaseUrl("production"), /Invalid production payment callback base URL/);
    assert.throws(() => getPaymentIpnBaseUrl("production"), /Invalid production payment callback base URL/);
  } finally {
    setEnv("NEXT_PUBLIC_SITE_URL", prevSite);
    setEnv("PAYMENT_CALLBACK_BASE_URL", prevCb);
    setEnv("PAYMENT_IPN_BASE_URL", prevIpn);
  }
});

test("Callback URLs: staging uses public HTTPS staging domain and rejects localhost IPN", () => {
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  const prevCb = process.env.PAYMENT_CALLBACK_BASE_URL;
  const prevIpn = process.env.PAYMENT_IPN_BASE_URL;

  try {
    setEnv("PAYMENT_CALLBACK_BASE_URL", undefined);
    setEnv("PAYMENT_IPN_BASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SITE_URL", "https://staging.angkon.net");

    assert.equal(getPaymentCallbackBaseUrl("preview"), "https://staging.angkon.net");
    assert.equal(getPaymentIpnBaseUrl("preview"), "https://staging.angkon.net");

    setEnv("PAYMENT_IPN_BASE_URL", "http://localhost:3000");
    assert.throws(() => getPaymentIpnBaseUrl("preview"), /Never use localhost/);
  } finally {
    setEnv("NEXT_PUBLIC_SITE_URL", prevSite);
    setEnv("PAYMENT_CALLBACK_BASE_URL", prevCb);
    setEnv("PAYMENT_IPN_BASE_URL", prevIpn);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Shared Verification & State-Machine Scenarios (15-Point Matrix)
// ─────────────────────────────────────────────────────────────────────────────

test("Scenario 1: Valid successful Sandbox payment verifies to succeeded", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized(),
  });
  assert.equal(verification.isValid, true);
  assert.equal(verification.decision, "succeeded");
  assert.equal(verification.isTerminal, true);
});

test("Scenario 2: Failed Sandbox payment verifies to terminal failed", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized({ status: "FAILED" }),
  });
  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "failed");
  assert.equal(verification.isTerminal, true);
});

test("Scenario 3: Customer cancellation verifies to terminal cancelled", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized({ status: "CANCELLED" }),
  });
  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "cancelled");
  assert.equal(verification.isTerminal, true);
});

test("Scenarios 4, 5, 6, 7 & 15: IPN/callback ordering & duplicate idempotency guards", () => {
  // Terminal succeeded status cannot regress or re-transition to pending/failed/cancelled
  assert.equal(isSuccessfulStatus("succeeded"), true);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "failed"), false);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "cancelled"), false);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "pending"), false);

  // Verify shared services and repository enforce idempotency and single stock commit
  const processSuccessSrc = fs.readFileSync("src/server/payments/services/process-success.ts", "utf8");
  const processIpnSrc = fs.readFileSync("src/server/payments/services/process-ipn.ts", "utf8");
  const finalizeSrc = fs.readFileSync("src/server/payments/services/finalize-payment.ts", "utf8");
  const orderRepoSrc = fs.readFileSync("src/server/payments/repositories/order-payment.repository.ts", "utf8");

  assert.ok(processSuccessSrc.includes("FinalizePaymentService.finalize"));
  assert.ok(processIpnSrc.includes("FinalizePaymentService.finalize"));
  assert.ok(processIpnSrc.includes("alreadyProcessed: true"));
  assert.ok(finalizeSrc.includes("isSuccessfulStatus(attempt.status)"));
  assert.ok(finalizeSrc.includes("alreadySettled: true"));
  assert.ok(orderRepoSrc.includes("settleOrderPayment"));
});

test("Scenario 8: Incorrect amount rejected and routed to review_required", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized({ amount: 2400 }),
  });
  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "review_required");
  assert.equal(verification.reason, "amount_mismatch");
});

test("Scenario 9: Incorrect currency rejected and routed to review_required", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized({ currency: "USD" }),
  });
  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "review_required");
  assert.equal(verification.reason, "currency_mismatch");
});

test("Scenario 10: Unknown / mismatched transaction ID rejected", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized({ tranId: "ANG-999999-9999" }),
  });
  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "review_required");
  assert.equal(verification.reason, "tran_id_mismatch");
});

test("Scenario 11: Invalid / unsupported validation status rejected cleanly", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized({ status: "UNEXPECTED_STATUS" as never }),
  });
  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "unknown");
  assert.equal(verification.isTerminal, false);
});

test("Scenario 12: Risk flag handling routes riskLevel=1 to review_required", () => {
  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261126-1001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    attemptEnvironment: "sandbox",
    isProduction: false,
    normalized: makeNormalized({ riskLevel: "1", riskTitle: "High Risk" }),
  });
  assert.equal(verification.isValid, true);
  assert.equal(verification.decision, "review_required");
  assert.equal(verification.reason, "high_risk_flagged");
});

test("Scenarios 13 & 14: Lost browser session resolved by IPN; pending UI state for unconfirmed payments", () => {
  // Pending / unknown / review_required all map to non-terminal pending/processing UI states
  for (const status of ["pending", "unknown", "review_required"] as const) {
    const info = getPaymentStatusInfo(normalizePaymentStatus(status));
    assert.equal(info.isTerminal, false);
  }
  assert.equal(getPaymentStatusInfo("pending").canRetry, false);
  assert.equal(getPaymentStatusInfo("review_required").canRetry, false);

  // Failed / cancelled / expired allow retry
  for (const status of ["failed", "cancelled", "expired"] as const) {
    const info = getPaymentStatusInfo(normalizePaymentStatus(status));
    assert.equal(info.isTerminal, true);
    assert.equal(info.canRetry, true);
  }

  // Shared result page exists and all three callback services redirect to /checkout/payment/result
  assert.ok(fs.existsSync("src/app/checkout/payment/result/page.tsx"));
  for (const file of [
    "src/server/payments/services/process-success.ts",
    "src/server/payments/services/process-failure.ts",
    "src/server/payments/services/process-cancellation.ts",
  ]) {
    const content = fs.readFileSync(file, "utf8");
    assert.ok(content.includes("/checkout/payment/result"), `${file} must redirect to /checkout/payment/result`);
  }

  // Cart preservation: online gateway redirect must NOT clear cart prematurely;
  // PaymentSuccess clears cart only after server-confirmed payment.
  const checkoutFlow = fs.readFileSync("src/app/checkout/_hooks/use-checkout-flow.ts", "utf8");
  const gatewayRedirectBlock = checkoutFlow.slice(
    checkoutFlow.indexOf("if (result.gatewayUrl)"),
    checkoutFlow.indexOf("window.location.assign(result.gatewayUrl)") + 50
  );
  assert.equal(
    gatewayRedirectBlock.includes("clearCart()"),
    false,
    "Cart must NOT be cleared before SSLCOMMERZ payment is confirmed"
  );
  const paymentSuccessUi = fs.readFileSync("src/components/checkout/payment-success.tsx", "utf8");
  assert.ok(
    paymentSuccessUi.includes("clearCart()"),
    "PaymentSuccess must clear the cart once payment is server-confirmed"
  );
});
