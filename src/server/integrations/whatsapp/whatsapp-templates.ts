/**
 * ANGKON — Smart WhatsApp Customer Communication Engine
 *
 * Pure, client- and server-safe utilities for:
 * 1. Bangladeshi phone number normalization for WhatsApp (wa.me) deep links.
 * 2. Dynamic order information extraction with financial safety (COD vs Prepaid vs Partial).
 * 3. Status-specific message templates for all 8 lifecycle states.
 * 4. Deep link URL encoding and preview generation.
 *
 * Completely dependency-free so it runs cleanly across browser, Node test runner, and Next.js.
 */

import type { WCOrder } from "@/app/admin/orders/_types/orders.types";

export type WhatsAppTemplateKey =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "custom";

export interface WhatsAppOrderContext {
  customerName: string;
  orderNumber: string;
  productNames: string;
  orderTotal: number;
  orderTotalFormatted: string;
  paidAmount: number;
  paidAmountFormatted: string;
  outstandingCod: number;
  outstandingCodFormatted: string;
  isPrepaid: boolean;
  isPartiallyPaid: boolean;
  paymentMethodDisplay: string;
  financialPaymentLine: string;
  deliveryAddress: string;
  courierName: string;
  trackingCode: string | null;
  consignmentId: string | null;
  trackingUrl: string | null;
  status: string;
  normalizedPhone: string | null;
  rawPhone: string;
}

export interface WhatsAppTemplateOption {
  key: WhatsAppTemplateKey;
  label: string;
  description: string;
}

export const WHATSAPP_TEMPLATE_OPTIONS: WhatsAppTemplateOption[] = [
  {
    key: "pending",
    label: "Pending — Request Confirmation",
    description: "Verify customer details and ask for confirmation",
  },
  {
    key: "confirmed",
    label: "Confirmed — Order Confirmation",
    description: "Confirm order acceptance and preparation for dispatch",
  },
  {
    key: "processing",
    label: "Processing — Preparation Update",
    description: "Notify customer of packing and quality checks",
  },
  {
    key: "ready_to_ship",
    label: "Ready to Ship — Dispatch Handover",
    description: "Notify customer parcel is packaged and awaiting carrier pickup",
  },
  {
    key: "shipped",
    label: "Shipped — Dispatch & Live Tracking",
    description: "Share carrier name, tracking code, and live tracking URL",
  },
  {
    key: "delivered",
    label: "Delivered — Thank You & Feedback",
    description: "Confirm delivery, thank customer, and invite feedback/reviews",
  },
  {
    key: "cancelled",
    label: "Cancelled — Order Cancellation",
    description: "Polite cancellation confirmation and refund/reassurance note",
  },
  {
    key: "returned",
    label: "Returned — Return Notification",
    description: "Confirm receipt of returned parcel and exchange/refund next steps",
  },
  {
    key: "custom",
    label: "Custom Message",
    description: "Write a customized message to the customer",
  },
];

export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

/**
 * Normalises a Bangladeshi mobile number to `01XXXXXXXXX`, or returns null.
 */
export function normalizeBdPhone(input: unknown): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("880")) local = local.slice(2);
  if (local.length === 10 && local.startsWith("1")) local = `0${local}`;
  if (!BD_PHONE_REGEX.test(local)) return null;
  return local;
}

/**
 * Normalizes a phone number to international WhatsApp format for Bangladesh: `8801XXXXXXXXX`.
 * wa.me requires digits only without leading '+' or spaces.
 */
export function normalizeWhatsAppPhone(input: unknown): string | null {
  const local = normalizeBdPhone(input);
  if (!local) return null;
  return `880${local.slice(1)}`;
}

/**
 * Formats a normalized or raw phone number for friendly UI display, e.g. +880 1712-345678.
 */
export function formatPhoneForDisplay(input: unknown): string {
  const wa = normalizeWhatsAppPhone(input);
  if (wa && wa.length === 13) {
    return `+${wa.slice(0, 3)} ${wa.slice(3, 7)}-${wa.slice(7)}`;
  }
  const str = String(input ?? "").trim();
  return str || "No phone provided";
}

/**
 * Builds the wa.me deep link URL with properly encoded message parameters.
 */
export function buildWhatsAppUrl(phone: unknown, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Resolves friendly courier label from provider code.
 */
export function getCourierLabel(courier?: string | null): string {
  const c = String(courier || "").toLowerCase().trim();
  if (c === "steadfast") return "Steadfast";
  if (c === "pathao") return "Pathao";
  if (c === "redx") return "RedX";
  if (c === "ecourier") return "eCourier";
  return "Steadfast";
}

/**
 * Resolves live tracking URL for supported carriers.
 */
export function getCourierTrackingUrl(
  courier?: string | null,
  trackingCode?: string | null,
  consignmentId?: string | null
): string | null {
  const c = String(courier || "").toLowerCase().trim();
  if (c === "steadfast" && trackingCode) {
    return `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`;
  }
  if (c === "pathao" && consignmentId) {
    return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(consignmentId)}`;
  }
  if (c === "redx" && trackingCode) {
    return `https://redx.com.bd/track-global-parcel/?trackingId=${encodeURIComponent(trackingCode)}`;
  }
  if (c === "ecourier" && trackingCode) {
    return `https://ecourier.com.bd/tracking/?tracking_no=${encodeURIComponent(trackingCode)}`;
  }
  return null;
}

/**
 * Internal money rounding helper.
 */
function roundMoney(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Formats monetary amounts in standard Bangladeshi Taka style.
 */
function formatTaka(amount: number): string {
  return Math.round(amount).toLocaleString("en-BD");
}

/**
 * Pure order financials computation engine for customer communication.
 */
function computeOrderFinancials(input: {
  total: unknown;
  paidAmount?: unknown;
  paymentStatus?: unknown;
  paymentMethod?: unknown;
  orderStatus?: unknown;
}) {
  const orderTotal = roundMoney(input.total);
  const paymentStatus = String(input.paymentStatus || "pending").trim().toLowerCase();
  const paymentMethod = String(input.paymentMethod || "cod").trim().toLowerCase();
  const orderStatus = String(input.orderStatus || "pending").trim().toLowerCase();

  let advancePaidAmount = roundMoney(input.paidAmount);
  if (paymentStatus === "paid") {
    advancePaidAmount = orderTotal;
  } else if (advancePaidAmount > orderTotal) {
    advancePaidAmount = orderTotal;
  }

  const outstandingAmount = roundMoney(Math.max(0, orderTotal - advancePaidAmount));
  const isPrepaidVerified =
    paymentStatus === "paid" || (orderTotal > 0 && outstandingAmount === 0);
  const isPartiallyPaid =
    !isPrepaidVerified && (paymentStatus === "partially_paid" || advancePaidAmount > 0);

  const isTerminalNonCollectible =
    orderStatus === "cancelled" ||
    orderStatus === "refunded" ||
    orderStatus === "failed" ||
    paymentStatus === "refunded" ||
    paymentStatus === "cancelled";

  let codAmountToCollect = 0;
  if (!isTerminalNonCollectible && !isPrepaidVerified) {
    codAmountToCollect = outstandingAmount;
  }

  return {
    orderTotal,
    advancePaidAmount,
    outstandingAmount,
    isPrepaidVerified,
    isPartiallyPaid,
    codAmountToCollect,
    paymentMethod,
  };
}

/**
 * Extracts and calculates comprehensive customer, order, financial, and tracking details.
 */
export function extractOrderWhatsAppContext(order: Partial<WCOrder>): WhatsAppOrderContext {
  const rawPhone =
    order.billing?.phone ||
    (order as Record<string, unknown>).phone ||
    "";
  const normalizedPhone = normalizeWhatsAppPhone(rawPhone);

  const firstName = order.billing?.first_name?.trim() || "";
  const lastName = order.billing?.last_name?.trim() || "";
  const rawFullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const customerName = rawFullName || "Customer";

  const orderNumber = String(order.number || order.id || "").trim() || "N/A";

  // Products
  const lineItems = order.line_items || [];
  let productNames = "ANGKON Collection";
  if (lineItems.length > 0) {
    productNames = lineItems
      .map((item) => {
        const qty = item.quantity || 1;
        const name = (item.name || "Item").trim();
        return qty > 1 ? `${qty}x ${name}` : name;
      })
      .join(", ");
  }

  // Financial safety via computeOrderFinancials
  const financials = computeOrderFinancials({
    total: order.total,
    paidAmount: order.paidAmount ? Number(order.paidAmount) : 0,
    paymentStatus: order.payment_status || order.paymentStatus,
    paymentMethod: order.paymentMethod,
    orderStatus: order.status,
  });

  const orderTotal = financials.orderTotal;
  const paidAmount = financials.advancePaidAmount;
  const outstandingCod = financials.codAmountToCollect;
  const isPrepaid = financials.isPrepaidVerified;
  const isPartiallyPaid = financials.isPartiallyPaid;

  const rawPaymentMethod = String(
    order.payment_method_title || order.paymentMethod || "Cash on Delivery"
  ).trim();

  let paymentMethodDisplay = "Cash on Delivery";
  if (isPrepaid) {
    paymentMethodDisplay = rawPaymentMethod.toLowerCase().includes("ssl")
      ? "Paid Online (SSLCOMMERZ)"
      : "Paid Online";
  } else if (isPartiallyPaid) {
    paymentMethodDisplay = `Partially Paid (Advance: ৳${formatTaka(paidAmount)})`;
  } else if (rawPaymentMethod.toLowerCase() === "cod" || !rawPaymentMethod) {
    paymentMethodDisplay = "Cash on Delivery";
  } else if (rawPaymentMethod) {
    paymentMethodDisplay = rawPaymentMethod;
  }

  // Financial safety line: NEVER ask prepaid customers to pay again!
  let financialPaymentLine = "";
  if (isPrepaid) {
    financialPaymentLine = `✅ Payment Status: Fully Paid Online (৳0 to pay upon delivery).`;
  } else if (isPartiallyPaid) {
    financialPaymentLine = `💰 Advance Paid: ৳${formatTaka(
      paidAmount
    )}. Please keep ৳${formatTaka(outstandingCod)} ready for payment upon delivery.`;
  } else {
    financialPaymentLine = `💰 Please keep ৳${formatTaka(
      outstandingCod
    )} ready for payment upon delivery.`;
  }

  // Delivery Address
  const addr1 = order.billing?.address_1?.trim() || "";
  const city = order.billing?.city?.trim() || "";
  const addressParts = [addr1, city].filter(Boolean);
  const deliveryAddress =
    addressParts.length > 0 ? addressParts.join(", ") : "Address on file";

  // Courier & Tracking
  const courierLabel = getCourierLabel(order.courier);
  const courierName =
    courierLabel && courierLabel !== "Unknown"
      ? `${courierLabel} Courier`
      : "Steadfast Courier";

  const trackingCode = order.trackingCode?.trim() || null;
  const consignmentId = order.consignmentId?.trim() || null;
  const trackingUrl = getCourierTrackingUrl(order.courier, trackingCode, consignmentId);

  const status = String(order.status || "pending").toLowerCase();

  return {
    customerName,
    orderNumber,
    productNames,
    orderTotal,
    orderTotalFormatted: formatTaka(orderTotal),
    paidAmount,
    paidAmountFormatted: formatTaka(paidAmount),
    outstandingCod,
    outstandingCodFormatted: formatTaka(outstandingCod),
    isPrepaid,
    isPartiallyPaid,
    paymentMethodDisplay,
    financialPaymentLine,
    deliveryAddress,
    courierName,
    trackingCode,
    consignmentId,
    trackingUrl,
    status,
    normalizedPhone,
    rawPhone: String(rawPhone),
  };
}

/**
 * Generates the prefilled message for a specific order and template key.
 */
export function generateWhatsAppMessage(
  order: Partial<WCOrder>,
  templateKey?: WhatsAppTemplateKey
): string {
  const ctx = extractOrderWhatsAppContext(order);
  const key =
    templateKey && templateKey !== "custom"
      ? templateKey
      : mapStatusToTemplateKey(ctx.status);

  switch (key) {
    case "pending":
      return (
`Hello ${ctx.customerName}! 👋

Thank you for placing your order with ANGKON! ❤️

We have received your order and would like to confirm your details before dispatch:

📦 *Order Details*
Order ID: #${ctx.orderNumber}
Product: ${ctx.productNames}
Total Amount: ৳${ctx.orderTotalFormatted}
Payment Method: ${ctx.paymentMethodDisplay}

📍 *Delivery Address*
${ctx.deliveryAddress}

${ctx.financialPaymentLine}

To confirm your order, simply reply to this message with *"CONFIRM"* or let us know if you need any adjustments.

Thank you for choosing ANGKON!
*ANGKON – Style That Speaks.*`
      );

    case "confirmed":
      return (
`Hello ${ctx.customerName}! 👋

Thank you for shopping with ANGKON! ❤️

We're happy to inform you that your order has been confirmed and is now being prepared for dispatch.

📦 *Order Details*
Order ID: #${ctx.orderNumber}
Product: ${ctx.productNames}
Total Amount: ৳${ctx.orderTotalFormatted}
Payment Method: ${ctx.paymentMethodDisplay}

📍 *Delivery Address*
${ctx.deliveryAddress}

${ctx.financialPaymentLine}

We'll notify you when your parcel is handed over to our delivery partner.

If you have any questions or need to update your delivery information, simply reply to this message.

Thank you for choosing ANGKON! ❤️
We're grateful for your trust.

*ANGKON – Style That Speaks.*`
      );

    case "processing":
      return (
`Hello ${ctx.customerName}! 👋

An update regarding your ANGKON order #${ctx.orderNumber}:

Your items are currently being carefully packaged and quality checked at our fulfillment center.

📦 *Order Details*
Product: ${ctx.productNames}
Total Amount: ৳${ctx.orderTotalFormatted}
Payment Method: ${ctx.paymentMethodDisplay}

📍 *Delivery Address*
${ctx.deliveryAddress}

${ctx.financialPaymentLine}

We'll send you another notification with carrier details as soon as your parcel is dispatched.

Thank you for your patience! ❤️
*ANGKON – Style That Speaks.*`
      );

    case "ready_to_ship":
      return (
`Hello ${ctx.customerName}! 👋

Great news! Your ANGKON order #${ctx.orderNumber} has been packaged and is ready for courier handover.

📦 *Order Details*
Product: ${ctx.productNames}
Courier Partner: ${ctx.courierName}
Payment Method: ${ctx.paymentMethodDisplay}

📍 *Delivery Address*
${ctx.deliveryAddress}

${ctx.financialPaymentLine}

Our delivery partner will collect your parcel shortly.

If you have any last-minute delivery updates, please let us know immediately.

Thank you for choosing ANGKON! ❤️
*ANGKON – Style That Speaks.*`
      );

    case "shipped": {
      const trackingLines: string[] = [];
      if (ctx.trackingCode) {
        trackingLines.push(`Tracking Number: ${ctx.trackingCode}`);
      }
      if (ctx.trackingUrl) {
        trackingLines.push(`Live Tracking: ${ctx.trackingUrl}`);
      }
      const trackingSection =
        trackingLines.length > 0 ? `\n${trackingLines.join("\n")}` : "";

      return (
`Hello ${ctx.customerName}! 👋

Your ANGKON order #${ctx.orderNumber} is on its way! 🚚

📦 *Shipment Details*
Product: ${ctx.productNames}
Courier Partner: ${ctx.courierName}${trackingSection}

📍 *Delivery Address*
${ctx.deliveryAddress}

${ctx.financialPaymentLine}

Standard delivery takes 24–48 hours inside Dhaka and 2–4 business days nationwide. Please keep your phone reachable for the delivery rider.

Thank you for shopping with ANGKON! ❤️
*ANGKON – Style That Speaks.*`
      );
    }

    case "delivered":
      return (
`Hello ${ctx.customerName}! 👋

Our records show that your ANGKON order #${ctx.orderNumber} has been successfully delivered! 🎉

We hope you love your new purchase! ❤️

📦 *Items Delivered*
${ctx.productNames}

Your satisfaction means everything to us. If you have a moment, please let us know how your experience was or tag us in your look!

For any exchange or sizing assistance within 3 days, simply reply to this message.

Thank you for being part of the ANGKON family! ❤️
*ANGKON – Style That Speaks.*`
      );

    case "cancelled": {
      const refundNote = ctx.isPrepaid
        ? "If you completed an online payment, our accounts team is processing your refund, which will be credited within 3–7 business days."
        : "No payment is required as this was a Cash on Delivery order.";

      return (
`Hello ${ctx.customerName},

This is to confirm that your ANGKON order #${ctx.orderNumber} has been cancelled as requested.

${refundNote}

We're sorry this purchase didn't work out. Whenever you're ready, you're always welcome to explore our latest collection at angkon.com.bd.

If this cancellation was made in error, please reply to this message directly.

Warm regards,
*ANGKON – Style That Speaks.*`
      );
    }

    case "returned":
      return (
`Hello ${ctx.customerName},

We have received the returned parcel for ANGKON order #${ctx.orderNumber}.

Our returns team has inspected the items and will process your replacement or refund promptly according to our exchange policy.

We will notify you as soon as your replacement is dispatched or your refund is settled.

If you have any questions regarding your return, please reply directly to this chat.

Thank you for your patience and understanding.
*ANGKON – Style That Speaks.*`
      );

    case "custom":
    default:
      return (
`Hello ${ctx.customerName}! 👋

This is ANGKON regarding your order #${ctx.orderNumber}.

If you have any questions or need updates, please let us know.

*ANGKON – Style That Speaks.*`
      );
  }
}

/**
 * Maps order status onto the recommended initial WhatsApp template.
 */
export function mapStatusToTemplateKey(status?: string | null): WhatsAppTemplateKey {
  const s = String(status || "").trim().toLowerCase();
  switch (s) {
    case "pending":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "processing":
      return "processing";
    case "ready_to_ship":
      return "ready_to_ship";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "returned":
      return "returned";
    default:
      return "confirmed";
  }
}
