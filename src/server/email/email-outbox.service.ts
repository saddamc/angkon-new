import crypto from "node:crypto";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  EmailDelivery,
  type IEmailDelivery,
  type EmailNotificationType,
} from "@/models/EmailDelivery";
import { Order } from "@/models/Order";
import { sendEmail, getOrderNotificationEmails, type SendEmailResult, type EmailAttachment } from "@/lib/email/resend";
import { getCustomerOrderEmailHtml, getAdminOrderEmailHtml, type EmailOrderData } from "@/lib/email/templates";
import { getPaymentInvoiceEmailHtml, type PaymentInvoiceEmailData } from "@/lib/email/invoice-email";
import { generateOrderInvoicePdf, type InvoicePdfInput } from "@/lib/invoice/invoice-pdf";
import type { ResendWebhookPayload } from "@/lib/email/resend-webhook";

const STALE_CLAIM_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ATTEMPTS = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface OrderEmailSnapshot {
  orderId?: string | null;
  userId?: string | null;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paidAmount?: number | null;
  expectedCodAmount?: number | null;
  subtotal: number;
  shippingFee: number;
  discount?: number;
  promoCode?: string;
  total: number;
  notes?: string;
  createdAt?: string | null;
  paidAt?: string | null;
  customer: {
    fullName: string;
    email?: string;
    phone: string;
    address: string;
    city?: string;
    district: string;
    postalCode?: string;
  };
  items: Array<{
    productId: number;
    slug?: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    image?: string;
  }>;
  payment?: {
    attemptId?: string | null;
    tranId: string;
    valId?: string | null;
    bankTranId?: string | null;
    cardType?: string | null;
    cardBrand?: string | null;
    cardIssuer?: string | null;
    amount: number;
    currency?: string;
    paidAt?: string | null;
  } | null;
}

export interface EmailOutboxDeps {
  sendEmailFn?: typeof sendEmail;
  generatePdfFn?: typeof generateOrderInvoicePdf;
}

export function calculateEmailRetryBackoffMs(attemptCount: number): number {
  const baseMs = 30 * 1000 * Math.pow(2, Math.max(0, Math.min(attemptCount - 1, 6)));
  const jitterMs = Math.floor(Math.random() * 5000);
  return Math.min(baseMs + jitterMs, 60 * 60 * 1000); // Bounded at 60 minutes
}

function toInvoicePdfInput(snapshot: OrderEmailSnapshot): InvoicePdfInput {
  return {
    orderNumber: snapshot.orderNumber,
    createdAt: snapshot.createdAt || null,
    orderStatus: snapshot.orderStatus || null,
    paymentMethod: snapshot.paymentMethod,
    paymentStatus: snapshot.paymentStatus || null,
    paidAmount: snapshot.paidAmount ?? null,
    expectedCodAmount: snapshot.expectedCodAmount ?? null,
    subtotal: snapshot.subtotal,
    shippingFee: snapshot.shippingFee,
    discount: snapshot.discount ?? 0,
    promoCode: snapshot.promoCode || null,
    total: snapshot.total,
    notes: snapshot.notes || null,
    customer: snapshot.customer,
    items: snapshot.items,
    payment: snapshot.payment
      ? {
          provider: "sslcommerz",
          status: snapshot.paymentStatus || "paid",
          tranId: snapshot.payment.tranId,
          valId: snapshot.payment.valId || null,
          bankTranId: snapshot.payment.bankTranId || null,
          cardType: snapshot.payment.cardType || null,
          cardBrand: snapshot.payment.cardBrand || null,
          cardIssuer: snapshot.payment.cardIssuer || null,
          paidAt: snapshot.payment.paidAt || snapshot.paidAt || null,
        }
      : null,
  };
}

export function renderEmailContentFromSnapshot(
  notificationType: EmailNotificationType,
  snapshot: OrderEmailSnapshot
): { html: string; pdfInput: InvoicePdfInput | null } {
  const emailOrderData: EmailOrderData = {
    orderNumber: snapshot.orderNumber,
    customer: snapshot.customer,
    items: snapshot.items,
    subtotal: snapshot.subtotal,
    shippingFee: snapshot.shippingFee,
    discount: snapshot.discount,
    promoCode: snapshot.promoCode,
    total: snapshot.total,
    paymentMethod: snapshot.paymentMethod,
    notes: snapshot.notes,
    createdAt: snapshot.createdAt || undefined,
  };

  switch (notificationType) {
    case "cod_order_confirmation_customer":
      return {
        html: getCustomerOrderEmailHtml(emailOrderData),
        pdfInput: toInvoicePdfInput(snapshot),
      };
    case "cod_order_confirmation_admin":
      return {
        html: getAdminOrderEmailHtml(emailOrderData),
        pdfInput: toInvoicePdfInput(snapshot),
      };
    case "online_order_received_customer":
      return {
        html: getCustomerOrderEmailHtml(emailOrderData),
        pdfInput: null, // Unpaid online order never issues a paid invoice
      };
    case "online_order_received_admin":
      return {
        html: getAdminOrderEmailHtml(emailOrderData),
        pdfInput: null,
      };
    case "paid_invoice_customer":
    case "paid_invoice_admin": {
      const invoiceData: PaymentInvoiceEmailData = {
        order: {
          orderNumber: snapshot.orderNumber,
          customer: snapshot.customer,
          items: snapshot.items,
          subtotal: snapshot.subtotal,
          shippingFee: snapshot.shippingFee,
          discount: snapshot.discount,
          promoCode: snapshot.promoCode,
          total: snapshot.total,
          paymentMethod: snapshot.paymentMethod,
          notes: snapshot.notes,
          createdAt: snapshot.createdAt || undefined,
          paidAt: snapshot.paidAt || null,
        },
        payment: {
          tranId: snapshot.payment?.tranId || snapshot.orderNumber,
          valId: snapshot.payment?.valId || null,
          cardType: snapshot.payment?.cardType || null,
          bankTranId: snapshot.payment?.bankTranId || null,
          amount: snapshot.payment?.amount ?? snapshot.total,
          currency: snapshot.payment?.currency || "BDT",
          paidAt: snapshot.payment?.paidAt || snapshot.paidAt || null,
        },
      };
      return {
        html: getPaymentInvoiceEmailHtml(invoiceData),
        pdfInput: toInvoicePdfInput(snapshot),
      };
    }
  }
}

/**
 * Processes one claimed EmailDelivery row safely.
 * Never throws; transient failures schedule bounded exponential backoff.
 */
export async function processClaimedEmailDelivery(
  doc: IEmailDelivery,
  deps: EmailOutboxDeps = {}
): Promise<{
  status: IEmailDelivery["status"];
  providerMessageId?: string | null;
  error?: string | null;
}> {
  const sendFn = deps.sendEmailFn || sendEmail;
  const pdfFn = deps.generatePdfFn || generateOrderInvoicePdf;
  const snapshot = doc.payloadSnapshot as unknown as OrderEmailSnapshot;

  let html: string;
  const attachments: EmailAttachment[] = [];

  try {
    const rendered = renderEmailContentFromSnapshot(doc.notificationType, snapshot);
    html = rendered.html;

    if (doc.hasPdfAttachment && rendered.pdfInput) {
      const pdfBuffer = await pdfFn(rendered.pdfInput);
      attachments.push({
        filename: doc.attachmentFilename || `ANGKON-Invoice-${snapshot.orderNumber}.pdf`,
        content: Buffer.from(pdfBuffer).toString("base64"),
        contentType: "application/pdf",
      });
    }
  } catch (pdfErr) {
    const errMessage = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
    const exhausted = doc.attemptCount >= doc.maxAttempts;
    const nextStatus = exhausted ? "failed_permanent" : "retrying";
    const nextAttemptAt = exhausted
      ? null
      : new Date(Date.now() + calculateEmailRetryBackoffMs(doc.attemptCount));

    await EmailDelivery.updateOne(
      { _id: doc._id, claimToken: doc.claimToken },
      {
        $set: {
          status: nextStatus,
          failureCategory: "pdf_error",
          lastError: `PDF generation failed: ${errMessage}`,
          nextAttemptAt,
          failedAt: exhausted ? new Date() : null,
          claimToken: null,
          claimedAt: null,
        },
      }
    );

    return { status: nextStatus, error: errMessage };
  }

  const recipients = doc.recipient
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  let res: SendEmailResult;
  try {
    res = await sendFn({
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject: doc.subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
      idempotencyKey: doc.idempotencyKey,
    });
  } catch (sendErr) {
    res = {
      success: false,
      isTransient: true,
      error: sendErr instanceof Error ? sendErr.message : String(sendErr),
    };
  }

  if (res.success) {
    const now = new Date();
    await EmailDelivery.updateOne(
      { _id: doc._id, claimToken: doc.claimToken },
      {
        $set: {
          status: "provider_accepted",
          providerMessageId: res.id || null,
          providerAcceptedAt: now,
          lastError: null,
          failureCategory: null,
          nextAttemptAt: null,
          claimToken: null,
          claimedAt: null,
        },
      }
    );

    // Only set Order.invoiceSentAt AFTER Resend actually accepts the invoice request
    if (doc.notificationType === "paid_invoice_customer" && doc.orderNumber) {
      await Order.updateOne(
        { orderNumber: doc.orderNumber, invoiceSentAt: null },
        { $set: { invoiceSentAt: now } }
      ).catch(() => {});
    }

    return { status: "provider_accepted", providerMessageId: res.id || null };
  }

  const isTransient = res.isTransient !== false;
  const exhausted = !isTransient || doc.attemptCount >= doc.maxAttempts;
  const nextStatus = exhausted ? "failed_permanent" : "retrying";
  const nextAttemptAt = exhausted
    ? null
    : new Date(Date.now() + calculateEmailRetryBackoffMs(doc.attemptCount));

  await EmailDelivery.updateOne(
    { _id: doc._id, claimToken: doc.claimToken },
    {
      $set: {
        status: nextStatus,
        failureCategory: isTransient ? "transient" : "permanent",
        lastError: res.error || "Email provider rejected request",
        nextAttemptAt,
        failedAt: exhausted ? new Date() : null,
        claimToken: null,
        claimedAt: null,
      },
    }
  );

  return { status: nextStatus, error: res.error || "Email provider rejected request" };
}

/**
 * Enqueues a deduplicated email record and performs an immediate claimed send attempt.
 * Concurrent callers with the same deduplicationKey cannot send duplicates.
 */
export async function enqueueAndAttemptEmailDelivery(
  args: {
    deduplicationKey: string;
    notificationType: EmailNotificationType;
    recipient: string;
    subject: string;
    hasPdfAttachment: boolean;
    attachmentFilename?: string | null;
    snapshot: OrderEmailSnapshot;
    maxAttempts?: number;
  },
  deps: EmailOutboxDeps = {}
): Promise<{
  enqueued: boolean;
  alreadyHandled: boolean;
  deliveryId?: string;
  status?: IEmailDelivery["status"];
}> {
  await connectToDatabase();

  const orderId =
    args.snapshot.orderId && Types.ObjectId.isValid(args.snapshot.orderId)
      ? new Types.ObjectId(args.snapshot.orderId)
      : null;
  const userId =
    args.snapshot.userId && Types.ObjectId.isValid(args.snapshot.userId)
      ? new Types.ObjectId(args.snapshot.userId)
      : null;
  const paymentAttemptId =
    args.snapshot.payment?.attemptId && Types.ObjectId.isValid(args.snapshot.payment.attemptId)
      ? new Types.ObjectId(args.snapshot.payment.attemptId)
      : null;

  const doc = await EmailDelivery.findOneAndUpdate(
    { deduplicationKey: args.deduplicationKey },
    {
      $setOnInsert: {
        deduplicationKey: args.deduplicationKey,
        notificationType: args.notificationType,
        orderId,
        orderNumber: args.snapshot.orderNumber,
        userId,
        paymentAttemptId,
        recipient: args.recipient,
        subject: args.subject,
        hasPdfAttachment: args.hasPdfAttachment,
        attachmentFilename: args.attachmentFilename || null,
        status: "queued",
        attemptCount: 0,
        maxAttempts: args.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: new Date(),
        idempotencyKey: args.deduplicationKey,
        payloadSnapshot: args.snapshot as unknown as Record<string, unknown>,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  if (!doc) {
    return { enqueued: false, alreadyHandled: false };
  }

  // Never duplicate an in-flight, accepted, or delivered notification
  if (
    ["processing", "provider_accepted", "delivered", "delivery_delayed"].includes(doc.status)
  ) {
    return {
      enqueued: false,
      alreadyHandled: true,
      deliveryId: String(doc._id),
      status: doc.status,
    };
  }

  const claimToken = crypto.randomUUID();
  const claimed = await EmailDelivery.findOneAndUpdate(
    {
      _id: doc._id,
      status: { $in: ["queued", "retrying"] },
    },
    {
      $set: {
        status: "processing",
        claimToken,
        claimedAt: new Date(),
      },
      $inc: { attemptCount: 1 },
    },
    { returnDocument: "after" }
  );

  if (!claimed) {
    return {
      enqueued: false,
      alreadyHandled: true,
      deliveryId: String(doc._id),
      status: doc.status,
    };
  }

  const outcome = await processClaimedEmailDelivery(claimed, deps);
  return {
    enqueued: true,
    alreadyHandled: false,
    deliveryId: String(claimed._id),
    status: outcome.status,
  };
}

/**
 * Recovers stale claims stuck in "processing" beyond STALE_CLAIM_MS.
 */
export async function recoverStaleEmailClaims(): Promise<number> {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - STALE_CLAIM_MS);
  const res = await EmailDelivery.updateMany(
    {
      status: "processing",
      claimedAt: { $lt: cutoff },
    },
    {
      $set: {
        status: "retrying",
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: new Date(),
      },
    }
  );
  return res.modifiedCount || 0;
}

/**
 * Drains queued and due retrying emails using atomic claim locks.
 */
export async function drainEmailDeliveryOutbox(
  batchLimit = 25,
  deps: EmailOutboxDeps = {}
): Promise<{
  processed: number;
  accepted: number;
  retrying: number;
  failedPermanent: number;
  recoveredStale: number;
}> {
  await connectToDatabase();
  const recoveredStale = await recoverStaleEmailClaims();
  const now = new Date();

  const dueItems = await EmailDelivery.find({
    status: { $in: ["queued", "retrying"] },
    $or: [{ nextAttemptAt: { $lte: now } }, { nextAttemptAt: null }, { nextAttemptAt: { $exists: false } }],
  })
    .sort({ createdAt: 1 })
    .limit(batchLimit)
    .select("_id")
    .lean();

  let processed = 0;
  let accepted = 0;
  let retrying = 0;
  let failedPermanent = 0;

  for (const item of dueItems) {
    const claimToken = crypto.randomUUID();
    const claimed = await EmailDelivery.findOneAndUpdate(
      {
        _id: item._id,
        status: { $in: ["queued", "retrying"] },
      },
      {
        $set: {
          status: "processing",
          claimToken,
          claimedAt: new Date(),
        },
        $inc: { attemptCount: 1 },
      },
      { returnDocument: "after" }
    );

    if (!claimed) continue; // Claimed concurrently by another worker

    processed += 1;
    const outcome = await processClaimedEmailDelivery(claimed, deps);
    if (outcome.status === "provider_accepted") accepted += 1;
    else if (outcome.status === "retrying") retrying += 1;
    else if (outcome.status === "failed_permanent") failedPermanent += 1;
  }

  return {
    processed,
    accepted,
    retrying,
    failedPermanent,
    recoveredStale,
  };
}

/**
 * Allows an administrator to manually retry a failed/bounced email delivery
 * with a fresh Resend Idempotency-Key epoch so Resend does not return 409/cached failure.
 */
export async function retryEmailDeliveryById(
  deliveryId: string,
  deps: EmailOutboxDeps = {}
): Promise<{ ok: boolean; status?: IEmailDelivery["status"]; error?: string }> {
  await connectToDatabase();
  const existing = await EmailDelivery.findById(deliveryId);
  if (!existing) {
    return { ok: false, error: "Email delivery record not found." };
  }

  const nextEpoch = (existing.attemptCount || 0) + 1;
  const claimToken = crypto.randomUUID();

  const claimed = await EmailDelivery.findOneAndUpdate(
    {
      _id: existing._id,
      status: { $in: ["retrying", "failed_permanent", "bounced", "delivery_delayed", "queued"] },
    },
    {
      $set: {
        status: "processing",
        claimToken,
        claimedAt: new Date(),
        nextAttemptAt: null,
        idempotencyKey: `${existing.deduplicationKey}:manual:${nextEpoch}`,
      },
      $inc: { attemptCount: 1 },
    },
    { returnDocument: "after" }
  );

  if (!claimed) {
    return {
      ok: false,
      status: existing.status,
      error: `Cannot retry delivery in "${existing.status}" state.`,
    };
  }

  const outcome = await processClaimedEmailDelivery(claimed, deps);
  return {
    ok: outcome.status === "provider_accepted",
    status: outcome.status,
    error: outcome.error || undefined,
  };
}

/**
 * Updates EmailDelivery status strictly from verified Resend webhook events.
 */
export async function applyResendWebhookEvent(
  svixId: string,
  event: ResendWebhookPayload
): Promise<{ matched: boolean; duplicate: boolean; status?: string }> {
  await connectToDatabase();
  const emailId = event.data?.email_id ? String(event.data.email_id).trim() : "";
  if (!emailId) {
    return { matched: false, duplicate: false };
  }

  const existing = await EmailDelivery.findOne({ providerMessageId: emailId });
  if (!existing) {
    return { matched: false, duplicate: false };
  }

  if (existing.webhookEvents?.some((e) => e.svixId === svixId)) {
    return { matched: true, duplicate: true, status: existing.status };
  }

  const eventDate = event.created_at ? new Date(event.created_at) : new Date();
  const safeDate = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate;
  const updateSet: Record<string, unknown> = {
    lastEventType: event.type,
  };

  let reason: string | null = null;
  if (event.type === "email.delivered") {
    updateSet.status = "delivered";
    updateSet.deliveredAt = safeDate;
    updateSet.lastError = null;
    updateSet.failureCategory = null;
  } else if (event.type === "email.delivery_delayed") {
    if (existing.status !== "delivered") {
      updateSet.status = "delivery_delayed";
    }
    reason = "Provider reported delivery_delayed";
    updateSet.lastError = reason;
  } else if (event.type === "email.bounced") {
    reason = event.data?.bounce?.message || "Recipient mail server bounced email";
    if (existing.status !== "delivered") {
      updateSet.status = "bounced";
      updateSet.failedAt = safeDate;
      updateSet.failureCategory = "provider_bounce";
      updateSet.lastError = reason;
    }
  } else if (event.type === "email.complained") {
    reason = "Recipient marked email as spam/complained";
    if (existing.status !== "delivered") {
      updateSet.status = "complained";
      updateSet.failedAt = safeDate;
      updateSet.failureCategory = "provider_bounce";
      updateSet.lastError = reason;
    }
  } else if (event.type === "email.failed") {
    reason = event.data?.failed?.reason || "Resend failed to deliver email";
    if (existing.status !== "delivered") {
      updateSet.status = "failed_permanent";
      updateSet.failedAt = safeDate;
      updateSet.failureCategory = "permanent";
      updateSet.lastError = reason;
    }
  }

  await EmailDelivery.updateOne(
    { _id: existing._id },
    {
      $set: updateSet,
      $push: {
        webhookEvents: {
          $each: [{ svixId, eventType: event.type, at: safeDate, reason }],
          $slice: -20,
        },
      },
    }
  );

  return {
    matched: true,
    duplicate: false,
    status: String(updateSet.status || existing.status),
  };
}

/**
 * Enqueues and attempts COD order confirmation (with COD PDF invoice attached)
 * or online order-received notification (without paid invoice).
 */
export async function dispatchOrderCreatedEmails(
  snapshot: OrderEmailSnapshot,
  deps: EmailOutboxDeps = {}
): Promise<void> {
  const isCod = String(snapshot.paymentMethod || "").trim().toLowerCase() === "cod";
  const customerEmail = (snapshot.customer.email || "").trim();

  if (customerEmail && EMAIL_REGEX.test(customerEmail)) {
    await enqueueAndAttemptEmailDelivery(
      {
        deduplicationKey: `${isCod ? "cod_confirm" : "online_received"}_customer:${snapshot.orderNumber}`,
        notificationType: isCod ? "cod_order_confirmation_customer" : "online_order_received_customer",
        recipient: customerEmail,
        subject: `Your ANGKON Order Confirmation #${snapshot.orderNumber}`,
        hasPdfAttachment: isCod,
        attachmentFilename: isCod ? `ANGKON-Invoice-${snapshot.orderNumber}.pdf` : null,
        snapshot,
      },
      deps
    );
  }

  const adminRecipients = getOrderNotificationEmails();
  if (adminRecipients.length > 0) {
    await enqueueAndAttemptEmailDelivery(
      {
        deduplicationKey: `${isCod ? "cod_confirm" : "online_received"}_admin:${snapshot.orderNumber}`,
        notificationType: isCod ? "cod_order_confirmation_admin" : "online_order_received_admin",
        recipient: adminRecipients.join(","),
        subject: `[New Order Alert] #${snapshot.orderNumber} - ${snapshot.customer.fullName} (৳${snapshot.total})`,
        hasPdfAttachment: isCod,
        attachmentFilename: isCod ? `ANGKON-Invoice-${snapshot.orderNumber}.pdf` : null,
        snapshot,
      },
      deps
    );
  }
}

/**
 * Enqueues and attempts Paid Invoice emails (with verified SSLCOMMERZ PDF attached)
 * strictly after canonical payment verification & finalization.
 */
export async function dispatchVerifiedPaidInvoiceEmails(
  snapshot: OrderEmailSnapshot,
  deps: EmailOutboxDeps = {}
): Promise<void> {
  const attemptScope = snapshot.payment?.attemptId || snapshot.payment?.tranId || snapshot.orderNumber;
  const customerEmail = (snapshot.customer.email || "").trim();

  if (customerEmail && EMAIL_REGEX.test(customerEmail)) {
    await enqueueAndAttemptEmailDelivery(
      {
        deduplicationKey: `paid_invoice_customer:${snapshot.orderNumber}:${attemptScope}`,
        notificationType: "paid_invoice_customer",
        recipient: customerEmail,
        subject: `Payment Receipt & Invoice #${snapshot.orderNumber} - ANGKON`,
        hasPdfAttachment: true,
        attachmentFilename: `ANGKON-Invoice-${snapshot.orderNumber}.pdf`,
        snapshot,
      },
      deps
    );
  }

  const adminRecipients = getOrderNotificationEmails();
  if (adminRecipients.length > 0) {
    await enqueueAndAttemptEmailDelivery(
      {
        deduplicationKey: `paid_invoice_admin:${snapshot.orderNumber}:${attemptScope}`,
        notificationType: "paid_invoice_admin",
        recipient: adminRecipients.join(","),
        subject: `[Payment Received & Invoice Issued] #${snapshot.orderNumber} - ${snapshot.customer.fullName} (৳${snapshot.total})`,
        hasPdfAttachment: true,
        attachmentFilename: `ANGKON-Invoice-${snapshot.orderNumber}.pdf`,
        snapshot,
      },
      deps
    );
  }
}
