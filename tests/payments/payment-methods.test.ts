import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COD_PAYMENT_METHOD,
  ONLINE_PAYMENT_METHODS,
  isOnlinePaymentMethod,
  getPaymentMethodLabel,
  getPaymentMethodBadge,
} from "../../src/lib/payment-methods";

describe("payment-methods shared helper", () => {
  it("recognizes every storefront gateway channel", () => {
    assert.deepEqual([...ONLINE_PAYMENT_METHODS], [
      "sslcommerz",
      "bkash",
      "nagad",
      "cards",
      "online",
    ]);
    for (const method of ONLINE_PAYMENT_METHODS) {
      assert.ok(isOnlinePaymentMethod(method), `${method} must be online`);
    }
  });

  it("is case- and whitespace-tolerant", () => {
    assert.equal(isOnlinePaymentMethod("CARDS"), true);
    assert.equal(isOnlinePaymentMethod("  bKash "), true);
  });

  it("treats COD and unknown values as offline", () => {
    assert.equal(isOnlinePaymentMethod("cod"), false);
    assert.equal(isOnlinePaymentMethod(COD_PAYMENT_METHOD), false);
    assert.equal(isOnlinePaymentMethod(null), false);
    assert.equal(isOnlinePaymentMethod(undefined), false);
    assert.equal(isOnlinePaymentMethod(""), false);
    assert.equal(isOnlinePaymentMethod("manual"), false);
  });

  it("labels the card channel like the checkout success page does", () => {
    assert.equal(getPaymentMethodLabel("cards"), "Card Payment (SSLCOMMERZ)");
    assert.equal(getPaymentMethodLabel("sslcommerz"), "SSLCOMMERZ Online Gateway");
    assert.equal(getPaymentMethodLabel("bkash"), "bKash Online Payment");
    assert.equal(getPaymentMethodLabel("nagad"), "Nagad Online Payment");
    assert.equal(getPaymentMethodLabel("cod"), "Cash on Delivery");
    assert.equal(getPaymentMethodLabel(null), "Cash on Delivery");
    // Custom gateway titles pass through untouched.
    assert.equal(getPaymentMethodLabel("SSLCOMMERZ Online Gateway"), "SSLCOMMERZ Online Gateway");
  });

  it("badges admin rows distinctly per channel", () => {
    assert.equal(getPaymentMethodBadge("cards"), "CARD");
    assert.equal(getPaymentMethodBadge("bkash"), "BKASH");
    assert.equal(getPaymentMethodBadge("nagad"), "NAGAD");
    assert.equal(getPaymentMethodBadge("sslcommerz"), "SSLCOMMERZ");
    assert.equal(getPaymentMethodBadge("online"), "SSLCOMMERZ");
    assert.equal(getPaymentMethodBadge("cod"), "COD");
    assert.equal(getPaymentMethodBadge(""), "COD");
  });
});
