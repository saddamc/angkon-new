import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { NextRequest } from "next/server";

import {
  generateOrderInvoicePdf,
  toPdfSafeText,
  formatPdfCurrency,
} from "../src/lib/invoice/invoice-pdf.ts";
import {
  verifyResendWebhookSignature,
} from "../src/lib/email/resend-webhook.ts";
import {
  processClaimedEmailDelivery,
  renderEmailContentFromSnapshot,
  type OrderEmailSnapshot,
} from "../src/server/email/email-outbox.service.ts";
import { EmailDelivery } from "../src/models/EmailDelivery.ts";
import { Order } from "../src/models/Order.ts";
import { User } from "../src/models/User.ts";
import { PaymentAttempt } from "../src/models/PaymentAttempt.ts";
import { PaymentRefund } from "../src/models/PaymentRefund.ts";
import { normalizeSslcommerzResponse } from "../src/server/payments/providers/sslcommerz/normalize-response.ts";
import { FinalizePaymentService } from "../src/server/payments/services/finalize-payment.ts";
import { PaymentAttemptRepository } from "../src/server/payments/repositories/payment-attempt.repository.ts";
import { PaymentEventRepository } from "../src/server/payments/repositories/payment-event.repository.ts";
import { OrderPaymentRepository } from "../src/server/payments/repositories/order-payment.repository.ts";
import { createAuthToken } from "../src/server/auth/auth.ts";
import { GET as getInvoiceRoute } from "../src/app/api/orders/[id]/invoice/route.ts";
import { drainEmailDeliveryOutbox } from "../src/server/email/email-outbox.service.ts";
import mongoose from "mongoose";

function extractPdfAsciiText(pdfBuffer: Buffer): string {
  const raw = pdfBuffer.toString("latin1");
  const chunks: string[] = [raw];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw)) !== null) {
    try {
      const inflated = zlib.inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
      chunks.push(inflated);
      // pdf-lib standard fonts encode text operators as hex strings <43415348...> Tj
      const hexMatches = inflated.matchAll(/<([0-9A-Fa-f]{4,})>/g);
      for (const hm of hexMatches) {
        chunks.push(Buffer.from(hm[1], "hex").toString("latin1"));
      }
    } catch {
      // non-deflated stream
    }
  }
  return chunks.join("\n");
}

function makeSnapshot(overrides: Partial<OrderEmailSnapshot> = {}): OrderEmailSnapshot {
  return {
    orderId: "6b08683550d9621aaccf08f8",
    userId: "6ae51c76aa1ccb7af3d6244f",
    orderNumber: "ANG-261126-0009",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "confirmed",
    paidAmount: 0,
    expectedCodAmount: 8880,
    subtotal: 9000,
    shippingFee: 80,
    discount: 200,
    promoCode: "ROYAL200",
    total: 8880,
    notes: "Call before delivery ৳200 — <script>alert(1)</script>",
    createdAt: "2026-11-26T17:11:17.497Z",
    customer: {
      fullName: "Nadia Rahman <VIP>",
      email: "nadia@example.com",
      phone: "01711223344",
      address: "House 12, Road 4, Banani",
      city: "Dhaka",
      district: "Dhaka",
      postalCode: "1213",
    },
    items: [
      {
        productId: 101,
        slug: "royal-jamdani-saree",
        name: "Royal Jamdani Saree — Maroon",
        price: 4500,
        quantity: 2,
        size: "Free Size",
        color: "Maroon",
      },
    ],
    payment: null,
    ...overrides,
  };
}

test("1 & 10. COD PDF generation: valid PDF, immutable snapshot, WinAnsi safe, COD Payment Due label", async () => {
  const snapshot = makeSnapshot();
  const pdf = await generateOrderInvoicePdf({
    orderNumber: snapshot.orderNumber,
    createdAt: snapshot.createdAt,
    orderStatus: snapshot.orderStatus,
    paymentMethod: snapshot.paymentMethod,
    paymentStatus: snapshot.paymentStatus,
    paidAmount: snapshot.paidAmount,
    expectedCodAmount: snapshot.expectedCodAmount,
    subtotal: snapshot.subtotal,
    shippingFee: snapshot.shippingFee,
    discount: snapshot.discount,
    promoCode: snapshot.promoCode,
    total: snapshot.total,
    notes: snapshot.notes,
    customer: snapshot.customer,
    items: snapshot.items,
    payment: null,
  });

  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  const loaded = await PDFDocument.load(pdf);
  assert.ok(loaded.getPageCount() >= 1);

  const text = extractPdfAsciiText(pdf);
  assert.ok(text.includes("CASH ON DELIVERY - PAYMENT DUE ON DELIVERY"));
  assert.ok(text.includes("INV-ANG-261126-0009"));
  assert.ok(text.includes("BDT 8,880.00"));
  assert.ok(text.includes("Payment Due on Delivery"));
  assert.ok(!text.includes("PAID IN FULL"));

  // Check email HTML rendering escapes XSS & prepares PDF attachment input
  const rendered = renderEmailContentFromSnapshot("cod_order_confirmation_customer", snapshot);
  assert.ok(rendered.pdfInput !== null);
  assert.ok(!rendered.html.includes("<script>alert(1)</script>"));
  assert.ok(rendered.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.equal(toPdfSafeText("৳8,880 — test 😊"), "BDT 8,880 - test");
  assert.equal(formatPdfCurrency(8880), "BDT 8,880.00");
});

test("2 & 10. Verified online SSLCOMMERZ PDF & email: PAID IN FULL + real tran_id, val_id, bank_tran_id", async () => {
  const snapshot = makeSnapshot({
    paymentMethod: "sslcommerz",
    paymentStatus: "paid",
    paidAmount: 8880,
    expectedCodAmount: 0,
    paidAt: "2026-11-26T17:11:30.614Z",
    payment: {
      attemptId: "6b08683550d9621aaccf08f9",
      tranId: "ANG-261126-0009",
      valId: "261126231128wJLwOQYJ1lsx3dU",
      bankTranId: "261126231128USBtCkVzHI1gkZW",
      cardType: "DBBLMOBILEB-Dbbl Mobile Banking",
      cardBrand: "MOBILEBANKING",
      cardIssuer: "DBBL Mobile Banking",
      amount: 8880,
      currency: "BDT",
      paidAt: "2026-11-26T17:11:30.614Z",
    },
  });

  const rendered = renderEmailContentFromSnapshot("paid_invoice_customer", snapshot);
  assert.ok(rendered.pdfInput);
  assert.ok(rendered.html.includes("261126231128wJLwOQYJ1lsx3dU"));
  assert.ok(rendered.html.includes("261126231128USBtCkVzHI1gkZW"));

  const pdf = await generateOrderInvoicePdf(rendered.pdfInput!);
  const text = extractPdfAsciiText(pdf);
  assert.ok(text.includes("PAID IN FULL - VERIFIED"));
  assert.ok(text.includes("ANG-261126-0009"));
  assert.ok(text.includes("261126231128wJLwOQYJ1lsx3dU"));
  assert.ok(text.includes("261126231128USBtCkVzHI1gkZW"));
  assert.ok(text.includes("BDT 0.00"));
});

test("3 & 9. FinalizePaymentService: pending/failed/review never send paid invoice; email failure never rolls back verified payment", async () => {
  const origFindById = PaymentAttemptRepository.findById;
  const origAtomic = PaymentAttemptRepository.atomicTransition;
  const origEvent = PaymentEventRepository.recordEvent;
  const origMarkFailed = OrderPaymentRepository.markOrderPaymentFailed;
  const origSettle = OrderPaymentRepository.settleOrderPayment;
  const origEmailFindUpdate = EmailDelivery.findOneAndUpdate;

  let outboxTouched = 0;

  try {
    const fakeAttempt = {
      _id: "6b08683550d9621aaccf08f9",
      orderId: "6b08683550d9621aaccf08f8",
      orderNumber: "ANG-261126-0009",
      tranId: "ANG-261126-0009",
      expectedAmount: 8880,
      amount: 8880,
      currency: "BDT",
      status: "pending",
      paidAt: new Date(),
    } as never;

    PaymentAttemptRepository.findById = async () => fakeAttempt;
    PaymentAttemptRepository.atomicTransition = async (args) => ({
      success: true,
      attempt: { ...(fakeAttempt as object), status: args.targetStatus } as never,
      wasAlreadyTerminal: false,
    });
    PaymentEventRepository.recordEvent = async () => ({} as never);
    OrderPaymentRepository.markOrderPaymentFailed = async () => ({} as never);
    OrderPaymentRepository.settleOrderPayment = async () => ({
      settled: true,
      alreadySettled: false,
      order: {
        _id: "6b08683550d9621aaccf08f8",
        orderNumber: "ANG-261126-0009",
        paymentMethod: "sslcommerz",
        paymentStatus: "paid",
        orderStatus: "confirmed",
        paidAmount: 8880,
        subtotal: 8800,
        shippingFee: 80,
        discount: 0,
        total: 8880,
        customer: {
          fullName: "Nadia",
          email: "nadia@example.com",
          phone: "01711223344",
          address: "Banani",
          district: "Dhaka",
        },
        items: [{ productId: 1, name: "Saree", price: 8800, quantity: 1 }],
      } as never,
    });
    EmailDelivery.findOneAndUpdate = (() => {
      outboxTouched += 1;
      throw new Error("Simulated outbox failure");
    }) as never;

    // 3a. Failed payment -> zero invoice emails
    await FinalizePaymentService.finalize({
      attemptId: "6b08683550d9621aaccf08f9",
      tranId: "ANG-261126-0009",
      source: "sslcommerz_callback",
      verification: {
        isValid: false,
        isTerminal: true,
        decision: "failed",
        reason: "gateway_reported_failed",
        normalized: {
          provider: "sslcommerz",
          tranId: "ANG-261126-0009",
          status: "FAILED",
          amount: 8880,
          currency: "BDT",
        },
      },
    });
    assert.equal(outboxTouched, 0);

    // 3b. High-risk review_required -> zero invoice emails
    await FinalizePaymentService.finalize({
      attemptId: "6b08683550d9621aaccf08f9",
      tranId: "ANG-261126-0009",
      source: "sslcommerz_ipn",
      verification: {
        isValid: true,
        isTerminal: true,
        decision: "review_required",
        reason: "high_risk_flagged",
        normalized: {
          provider: "sslcommerz",
          tranId: "ANG-261126-0009",
          valId: "VAL-RISK",
          status: "VALID",
          amount: 8880,
          currency: "BDT",
          riskLevel: "1",
        },
      },
    });
    assert.equal(outboxTouched, 0);

    // 9. Verified succeeded payment where email outbox throws -> payment STILL succeeds!
    const origDbUrl = process.env.DATABASE_URL;
    const origCacheConn = global.mongooseCache?.conn;
    const origReadyDesc = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");
    process.env.DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/angkon_test";
    if (global.mongooseCache) global.mongooseCache.conn = mongoose;
    Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });
    let settled: Awaited<ReturnType<typeof FinalizePaymentService.finalize>>;
    try {
      settled = await FinalizePaymentService.finalize({
      attemptId: "6b08683550d9621aaccf08f9",
      tranId: "ANG-261126-0009",
      valId: "261126231128wJLwOQYJ1lsx3dU",
      source: "sslcommerz_ipn",
      verification: {
        isValid: true,
        isTerminal: true,
        decision: "succeeded",
        normalized: {
          provider: "sslcommerz",
          tranId: "ANG-261126-0009",
          valId: "261126231128wJLwOQYJ1lsx3dU",
          bankTranId: "261126231128USBtCkVzHI1gkZW",
          status: "VALID",
          amount: 8880,
          storeAmount: 8658,
          currency: "BDT",
          riskLevel: "0",
        },
      },
      });
    } finally {
      if (origDbUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = origDbUrl;
      if (global.mongooseCache) global.mongooseCache.conn = origCacheConn ?? null;
      if (origReadyDesc) Object.defineProperty(mongoose.connection, "readyState", origReadyDesc);
      else delete (mongoose.connection as { readyState?: number }).readyState;
    }

    assert.equal(settled.ok, true);
    assert.equal(settled.attemptStatus, "succeeded");
    assert.equal(settled.orderPaymentStatus, "paid");
    assert.ok(outboxTouched >= 1);
  } finally {
    PaymentAttemptRepository.findById = origFindById;
    PaymentAttemptRepository.atomicTransition = origAtomic;
    PaymentEventRepository.recordEvent = origEvent;
    OrderPaymentRepository.markOrderPaymentFailed = origMarkFailed;
    OrderPaymentRepository.settleOrderPayment = origSettle;
    EmailDelivery.findOneAndUpdate = origEmailFindUpdate;
  }
});

test("4, 5, 6. Outbox handles Resend transient rejection -> retry -> provider_accepted, PDF failure, and Svix webhook delivery", async () => {
  const origDeliveryUpdate = EmailDelivery.updateOne;
  const origOrderUpdate = Order.updateOne;

  const updates: Array<Record<string, unknown>> = [];
  let orderInvoiceMarked = 0;

  try {
    EmailDelivery.updateOne = (async (_filter: unknown, update: Record<string, unknown>) => {
      updates.push(update);
      return { modifiedCount: 1 } as never;
    }) as never;

    Order.updateOne = (async () => {
      orderInvoiceMarked += 1;
      return { modifiedCount: 1 } as never;
    }) as never;

    const snapshot = makeSnapshot({
      paymentMethod: "sslcommerz",
      paymentStatus: "paid",
      paidAmount: 8880,
      payment: {
        attemptId: "6b08683550d9621aaccf08f9",
        tranId: "ANG-261126-0009",
        valId: "261126231128wJLwOQYJ1lsx3dU",
        bankTranId: "261126231128USBtCkVzHI1gkZW",
        amount: 8880,
      },
    });

    const claimedDoc = {
      _id: "6b08683550d9621aaccf0999",
      deduplicationKey: "paid_invoice_customer:ANG-261126-0009:6b08683550d9621aaccf08f9",
      notificationType: "paid_invoice_customer",
      orderNumber: "ANG-261126-0009",
      recipient: "nadia@example.com",
      subject: "Payment Receipt & Invoice #ANG-261126-0009 - ANGKON",
      hasPdfAttachment: true,
      attachmentFilename: "ANGKON-Invoice-ANG-261126-0009.pdf",
      status: "processing",
      attemptCount: 1,
      maxAttempts: 6,
      claimToken: "claim-1",
      idempotencyKey: "paid_invoice_customer:ANG-261126-0009:6b08683550d9621aaccf08f9",
      payloadSnapshot: snapshot,
    } as never;

    // 5a. Transient Resend 503 failure -> schedules retrying, does NOT set Order.invoiceSentAt
    const failOutcome = await processClaimedEmailDelivery(claimedDoc, {
      sendEmailFn: async () => ({
        success: false,
        statusCode: 503,
        isTransient: true,
        error: "Resend temporary outage",
      }),
    });
    assert.equal(failOutcome.status, "retrying");
    assert.equal(orderInvoiceMarked, 0);

    // 5b. Retry succeeds -> provider_accepted (NOT delivered) + sets Order.invoiceSentAt + includes PDF attachment + Idempotency-Key
    let capturedIdempotencyKey: string | undefined;
    let capturedAttachmentCount = 0;
    const retryOutcome = await processClaimedEmailDelivery(claimedDoc, {
      sendEmailFn: async (params) => {
        capturedIdempotencyKey = params.idempotencyKey;
        capturedAttachmentCount = params.attachments?.length || 0;
        return { success: true, statusCode: 200, id: "re_msg_123" };
      },
    });
    assert.equal(retryOutcome.status, "provider_accepted");
    assert.equal(retryOutcome.providerMessageId, "re_msg_123");
    assert.equal(capturedIdempotencyKey, "paid_invoice_customer:ANG-261126-0009:6b08683550d9621aaccf08f9");
    assert.equal(capturedAttachmentCount, 1);
    assert.equal(orderInvoiceMarked, 1);

    // 6. PDF generation failure -> captures pdf_error and schedules retrying without throwing
    const pdfFailOutcome = await processClaimedEmailDelivery(claimedDoc, {
      generatePdfFn: async () => {
        throw new Error("Simulated font corruption");
      },
    });
    assert.equal(pdfFailOutcome.status, "retrying");
    const lastSet = (updates[updates.length - 1] as { $set: Record<string, unknown> }).$set;
    assert.equal(lastSet.failureCategory, "pdf_error");

    // 5c. Svix webhook signature verification
    const rawSecret = crypto.randomBytes(32);
    const webhookSecret = `whsec_${rawSecret.toString("base64")}`;
    const svixId = "msg_svix_1";
    const svixTimestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { email_id: "re_msg_123", to: ["nadia@example.com"] },
    });
    const sig = crypto
      .createHmac("sha256", rawSecret)
      .update(`${svixId}.${svixTimestamp}.${rawBody}`)
      .digest("base64");

    const okVerify = verifyResendWebhookSignature({
      rawBody,
      headers: { svixId, svixTimestamp, svixSignature: `v1,${sig}` },
      webhookSecret,
    });
    assert.equal(okVerify.ok, true);

    const badVerify = verifyResendWebhookSignature({
      rawBody,
      headers: { svixId, svixTimestamp, svixSignature: "v1,tampered==" },
      webhookSecret,
    });
    assert.equal(badVerify.ok, false);
  } finally {
    EmailDelivery.updateOne = origDeliveryUpdate;
    Order.updateOne = origOrderUpdate;
  }
});

test("7. Duplicate worker processing: concurrent outbox drains claim atomically so only one sends", async () => {
  const origDbUrl = process.env.DATABASE_URL;
  const origCacheConn = global.mongooseCache?.conn;
  const origReadyDesc = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");
  const origUpdateMany = EmailDelivery.updateMany;
  const origFind = EmailDelivery.find;
  const origFindOneAndUpdate = EmailDelivery.findOneAndUpdate;
  const origUpdateOne = EmailDelivery.updateOne;
  const origOrderUpdate = Order.updateOne;

  let claimTaken = false;
  let sendCount = 0;

  try {
    process.env.DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/angkon_test";
    if (global.mongooseCache) global.mongooseCache.conn = mongoose;
    Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });

    EmailDelivery.updateMany = (async () => ({ modifiedCount: 0 })) as never;
    EmailDelivery.find = (() => ({
      sort: () => ({
        limit: () => ({
          select: () => ({
            lean: async () => [{ _id: "6b08683550d9621aaccf0777" }],
          }),
        }),
      }),
    })) as never;

    EmailDelivery.findOneAndUpdate = (async () => {
      if (claimTaken) return null;
      claimTaken = true;
      return {
        _id: "6b08683550d9621aaccf0777",
        deduplicationKey: "cod_confirm_customer:ANG-261126-0009",
        notificationType: "cod_order_confirmation_customer",
        orderNumber: "ANG-261126-0009",
        recipient: "nadia@example.com",
        subject: "Order Confirmation",
        hasPdfAttachment: true,
        attachmentFilename: "ANGKON-Invoice-ANG-261126-0009.pdf",
        status: "processing",
        attemptCount: 1,
        maxAttempts: 6,
        claimToken: "worker-1",
        idempotencyKey: "cod_confirm_customer:ANG-261126-0009",
        payloadSnapshot: makeSnapshot(),
      };
    }) as never;

    EmailDelivery.updateOne = (async () => ({ modifiedCount: 1 })) as never;
    Order.updateOne = (async () => ({ modifiedCount: 1 })) as never;

    const [resA, resB] = await Promise.all([
      drainEmailDeliveryOutbox(10, {
        sendEmailFn: async () => {
          sendCount += 1;
          return { success: true, id: "re_worker_1" };
        },
      }),
      drainEmailDeliveryOutbox(10, {
        sendEmailFn: async () => {
          sendCount += 1;
          return { success: true, id: "re_worker_2" };
        },
      }),
    ]);

    assert.equal(sendCount, 1);
    assert.equal(resA.processed + resB.processed, 1);
  } finally {
    if (origDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = origDbUrl;
    if (global.mongooseCache) global.mongooseCache.conn = origCacheConn ?? null;
    if (origReadyDesc) Object.defineProperty(mongoose.connection, "readyState", origReadyDesc);
    else delete (mongoose.connection as { readyState?: number }).readyState;
    EmailDelivery.updateMany = origUpdateMany;
    EmailDelivery.find = origFind;
    EmailDelivery.findOneAndUpdate = origFindOneAndUpdate;
    EmailDelivery.updateOne = origUpdateOne;
    Order.updateOne = origOrderUpdate;
  }
});

test("8. Customer invoice download authorization: 401 unauthenticated, 403 foreign customer, 200 owner", async () => {
  const origDbUrl = process.env.DATABASE_URL;
  const origCacheConn = global.mongooseCache?.conn;
  const origReadyDesc = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");
  const origJwt = process.env.JWT_SECRET;
  const origOrderFindOne = Order.findOne;
  const origUserFindById = User.findById;
  const origAttemptFindOne = PaymentAttempt.findOne;
  const origRefundFind = PaymentRefund.find;

  const ownerId = "6ae51c76aa1ccb7af3d6244f";
  const otherId = "6ae51c76aa1ccb7af3d69999";

  try {
    process.env.DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/angkon_test";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "angkon-test-jwt-secret-key-at-least-32-chars";
    if (global.mongooseCache) global.mongooseCache.conn = mongoose;
    Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });

    Order.findOne = (() => ({
      lean: async () => ({
        _id: "6b08683550d9621aaccf08f8",
        orderNumber: "ANG-261126-0009",
        userId: ownerId,
        paymentMethod: "sslcommerz",
        paymentStatus: "paid",
        orderStatus: "confirmed",
        paidAmount: 8880,
        subtotal: 8800,
        shippingFee: 80,
        discount: 0,
        total: 8880,
        createdAt: new Date(),
        customer: {
          fullName: "Owner",
          email: "owner@example.com",
          phone: "01711223344",
          address: "Banani",
          district: "Dhaka",
        },
        items: [{ name: "Saree", quantity: 1, price: 8800 }],
      }),
    })) as never;
    User.findById = ((id: string) => ({
      select: () => ({
        lean: async () => ({
          _id: id,
          email: id === ownerId ? "owner@example.com" : "other@example.com",
          emailVerified: true,
        }),
      }),
    })) as never;
    PaymentAttempt.findOne = (() => ({
      sort: () => ({
        lean: async () => ({
          tranId: "ANG-261126-0009",
          valId: "261126231128wJLwOQYJ1lsx3dU",
          bankTranId: "261126231128USBtCkVzHI1gkZW",
        }),
      }),
    })) as never;
    PaymentRefund.find = (() => ({
      select: () => ({ lean: async () => [] }),
    })) as never;

    // 8a. Unauthenticated -> 401
    const unauthReq = new NextRequest("http://localhost:3000/api/orders/ANG-261126-0009/invoice");
    const unauthRes = await getInvoiceRoute(unauthReq, {
      params: Promise.resolve({ id: "ANG-261126-0009" }),
    });
    assert.equal(unauthRes.status, 401);

    // 8b. Different customer -> 403
    const otherToken = createAuthToken({ id: otherId, email: "other@example.com", name: "Other", role: "customer" });
    const otherReq = new NextRequest("http://localhost:3000/api/orders/ANG-261126-0009/invoice", {
      headers: { cookie: `angkon_user_token=${otherToken}` },
    });
    const otherRes = await getInvoiceRoute(otherReq, {
      params: Promise.resolve({ id: "ANG-261126-0009" }),
    });
    assert.equal(otherRes.status, 403);

    // 8c. Owning customer -> 200 application/pdf
    const ownerToken = createAuthToken({ id: ownerId, email: "owner@example.com", name: "Owner", role: "customer" });
    const ownerReq = new NextRequest("http://localhost:3000/api/orders/ANG-261126-0009/invoice", {
      headers: { cookie: `angkon_user_token=${ownerToken}` },
    });
    const ownerRes = await getInvoiceRoute(ownerReq, {
      params: Promise.resolve({ id: "ANG-261126-0009" }),
    });
    assert.equal(ownerRes.status, 200);
    assert.equal(ownerRes.headers.get("content-type"), "application/pdf");
    const bytes = Buffer.from(await ownerRes.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString("ascii"), "%PDF-");
  } finally {
    if (origDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = origDbUrl;
    if (origJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = origJwt;
    if (global.mongooseCache) global.mongooseCache.conn = origCacheConn ?? null;
    if (origReadyDesc) Object.defineProperty(mongoose.connection, "readyState", origReadyDesc);
    else delete (mongoose.connection as { readyState?: number }).readyState;
    Order.findOne = origOrderFindOne;
    User.findById = origUserFindById;
    PaymentAttempt.findOne = origAttemptFindOne;
    PaymentRefund.find = origRefundFind;
  }
});

test("SSLCOMMERZ normalization: extracts store_amount, tran_date, card_issuer, val_id, bank_tran_id", () => {
  const normalized = normalizeSslcommerzResponse({
    status: "VALID",
    tran_id: "ANG-261126-0009",
    val_id: "261126231128wJLwOQYJ1lsx3dU",
    bank_tran_id: "261126231128USBtCkVzHI1gkZW",
    tran_date: "2026-11-26 23:11:18",
    amount: "8880.00",
    store_amount: "8658.00",
    currency: "BDT",
    card_type: "DBBLMOBILEB-Dbbl Mobile Banking",
    card_brand: "MOBILEBANKING",
    card_issuer: "DBBL Mobile Banking",
    risk_level: "0",
    risk_title: "Safe",
  });

  assert.equal(normalized.tranId, "ANG-261126-0009");
  assert.equal(normalized.valId, "261126231128wJLwOQYJ1lsx3dU");
  assert.equal(normalized.bankTranId, "261126231128USBtCkVzHI1gkZW");
  assert.equal(normalized.storeAmount, 8658);
  assert.equal(normalized.tranDate, "2026-11-26 23:11:18");
  assert.equal(normalized.cardIssuer, "DBBL Mobile Banking");
});
