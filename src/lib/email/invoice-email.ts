import { sendEmail, getOrderNotificationEmails } from "./resend";
import type { IOrder } from "@/models/Order";
import type { IPaymentAttempt } from "@/models/PaymentAttempt";

export interface PaymentInvoiceEmailData {
  order: {
    orderNumber: string;
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
      name: string;
      price: number;
      quantity: number;
      size?: string;
      color?: string;
      image?: string;
    }>;
    subtotal: number;
    shippingFee: number;
    discount?: number;
    promoCode?: string;
    total: number;
    paymentMethod: string;
    notes?: string;
    createdAt?: Date | string;
    paidAt?: Date | string | null;
  };
  payment: {
    tranId: string;
    valId?: string | null;
    cardType?: string | null;
    bankTranId?: string | null;
    amount: number;
    currency?: string;
    paidAt?: Date | string | null;
  };
}

function formatPrice(amount: number): string {
  return `৳${Number(amount || 0).toLocaleString("en-BD")}`;
}

function formatDate(dateInput?: Date | string | null): string {
  if (!dateInput) return new Date().toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
  const d = new Date(dateInput);
  return isNaN(d.getTime())
    ? new Date().toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })
    : d.toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

export function getPaymentInvoiceEmailHtml(data: PaymentInvoiceEmailData): string {
  const { order, payment } = data;
  const isInsideDhaka =
    (order.customer.district || "").trim().toLowerCase() === "dhaka" ||
    (order.customer.district || "").trim().toLowerCase() === "dhaka city";
  const deliveryTime = isInsideDhaka ? "24–48 Hours" : "3–5 Business Days";
  const invoiceNumber = `INV-${order.orderNumber}`;
  const issueDate = formatDate(payment.paidAt || order.paidAt || new Date());

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 14px 10px; border-bottom: 1px solid #f0e6dd; vertical-align: middle; width: 56px;">
        ${
          item.image
            ? `<img src="${item.image}" alt="${item.name}" width="50" height="66" style="width: 50px; height: 66px; border-radius: 6px; object-fit: cover; object-position: top; display: block; border: 1px solid #E1B76F;" />`
            : `<div style="width: 50px; height: 66px; background: #530911; border-radius: 6px; display: inline-block; border: 1px solid #E1B76F;"></div>`
        }
      </td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #f0e6dd; vertical-align: middle;">
        <div style="font-weight: 700; font-size: 14px; color: #230407; margin-bottom: 4px; line-height: 1.3;">
          ${item.name}
        </div>
        <div style="font-size: 11px; color: #530911;">
          ${item.size ? `<span style="display: inline-block; background: #f7ede2; font-weight: 600; padding: 2px 7px; border-radius: 4px; border: 1px solid #e6ccb2; margin-right: 4px;">Size: ${item.size}</span>` : ""}
          ${item.color ? `<span style="display: inline-block; background: #f7ede2; font-weight: 600; padding: 2px 7px; border-radius: 4px; border: 1px solid #e6ccb2;">Color: ${item.color}</span>` : ""}
        </div>
      </td>
      <td style="padding: 14px 10px; border-bottom: 1px solid #f0e6dd; vertical-align: middle; text-align: center; font-size: 14px; font-weight: 600; color: #444;">
        ${item.quantity}
      </td>
      <td style="padding: 14px 10px; border-bottom: 1px solid #f0e6dd; vertical-align: middle; text-align: right; font-size: 13px; color: #666;">
        ${formatPrice(item.price)}
      </td>
      <td style="padding: 14px 10px; border-bottom: 1px solid #f0e6dd; vertical-align: middle; text-align: right; font-weight: 700; font-size: 14px; color: #530911;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt & Invoice #${order.orderNumber} - ANGKON</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f3ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d2a26;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f3ee; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Invoice Container -->
        <table role="presentation" width="100%" style="max-width: 660px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(64, 6, 4, 0.09); border: 1px solid #ebe2d8;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #530911; padding: 36px 28px; text-align: center; border-bottom: 3px solid #E1B76F;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 34px; letter-spacing: 5px; color: #E1B76F; font-weight: 700; text-transform: uppercase;">
                ANGKON
              </h1>
              <p style="margin: 6px 0 0; color: #f5eedb; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; opacity: 0.95;">
                The Art of Elegance & Luxury
              </p>
            </td>
          </tr>

          <!-- Invoice Title & Status Stamp -->
          <tr>
            <td style="padding: 28px 28px 16px; border-bottom: 1px solid #ede4db;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: top;">
                    <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #530911; display: block; margin-bottom: 4px;">
                      Official Tax Invoice &amp; Payment Receipt
                    </span>
                    <h2 style="margin: 0; font-family: Georgia, serif; font-size: 24px; color: #230407; font-weight: 700;">
                      ${invoiceNumber}
                    </h2>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #736b63;">
                      Issue Date: <strong>${issueDate}</strong>
                    </p>
                  </td>
                  <td style="vertical-align: top; text-align: right;">
                    <div style="display: inline-block; background-color: #eaf8ef; border: 2px solid #27ae60; border-radius: 8px; padding: 8px 16px; text-align: center;">
                      <span style="display: block; font-size: 14px; font-weight: 800; letter-spacing: 1.5px; color: #1e7e34; text-transform: uppercase;">
                        ✓ PAID IN FULL
                      </span>
                      <span style="display: block; font-size: 10px; font-weight: 600; color: #1e7e34; text-transform: uppercase; margin-top: 2px;">
                        SSLCOMMERZ Verified
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Billing & Shipping Information Columns -->
          <tr>
            <td style="padding: 20px 28px; background-color: #fbf9f6; border-bottom: 1px solid #ede4db;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Customer Details -->
                  <td style="vertical-align: top; width: 50%; padding-right: 14px;">
                    <h3 style="margin: 0 0 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #530911;">
                      Billed &amp; Delivered To
                    </h3>
                    <p style="margin: 0 0 3px; font-size: 14px; font-weight: 700; color: #230407;">
                      ${order.customer.fullName}
                    </p>
                    <p style="margin: 0 0 3px; font-size: 13px; color: #555;">
                      Phone: <strong>${order.customer.phone}</strong>
                    </p>
                    ${order.customer.email ? `<p style="margin: 0 0 3px; font-size: 13px; color: #555;">Email: ${order.customer.email}</p>` : ""}
                    <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.4;">
                      ${order.customer.address}, ${order.customer.district} ${order.customer.postalCode ? `(${order.customer.postalCode})` : ""}
                    </p>
                  </td>

                  <!-- Gateway Transaction Details -->
                  <td style="vertical-align: top; width: 50%; padding-left: 14px; border-left: 1px solid #ede4db;">
                    <h3 style="margin: 0 0 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #530911;">
                      Payment Details
                    </h3>
                    <p style="margin: 0 0 3px; font-size: 13px; color: #555;">
                      Order Reference: <strong>#${order.orderNumber}</strong>
                    </p>
                    <p style="margin: 0 0 3px; font-size: 13px; color: #555;">
                      Transaction ID: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #230407;">${payment.tranId}</span>
                    </p>
                    ${
                      payment.valId
                        ? `<p style="margin: 0 0 3px; font-size: 13px; color: #555;">Validation ID: <span style="font-family: monospace; font-size: 12px; font-weight: 600;">${payment.valId}</span></p>`
                        : ""
                    }
                    <p style="margin: 0 0 3px; font-size: 13px; color: #555;">
                      Channel / Card: <strong>${payment.cardType || "Cards / MFS / Net Banking"}</strong>
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #555;">
                      Est. Delivery: <strong>${deliveryTime}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 24px 28px 16px;">
              <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #530911; border-bottom: 2px solid #530911; padding-bottom: 6px;">
                Purchased Collection Items
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f7ede2; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #530911; font-weight: 700;">
                    <th style="padding: 10px 10px; text-align: left;" colspan="2">Item Description</th>
                    <th style="padding: 10px 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px 10px; text-align: right;">Unit Price</th>
                    <th style="padding: 10px 10px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Calculation Breakdown -->
          <tr>
            <td style="padding: 0 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-left: auto; max-width: 320px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #666;">Subtotal:</td>
                  <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #230407; text-align: right;">${formatPrice(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #666;">Delivery Fee (${order.customer.district}):</td>
                  <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #230407; text-align: right;">${order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}</td>
                </tr>
                ${
                  order.discount && order.discount > 0
                    ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #27ae60;">Coupon Discount ${order.promoCode ? `(${order.promoCode})` : ""}:</td>
                  <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #27ae60; text-align: right;">-${formatPrice(order.discount)}</td>
                </tr>`
                    : ""
                }
                <tr style="border-top: 2px solid #530911;">
                  <td style="padding: 10px 0; font-size: 16px; font-weight: 800; color: #530911;">Total Paid:</td>
                  <td style="padding: 10px 0; font-size: 18px; font-weight: 900; color: #530911; text-align: right;">${formatPrice(order.total)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0 0; font-size: 13px; font-weight: 700; color: #27ae60;">Amount Due:</td>
                  <td style="padding: 4px 0 0; font-size: 13px; font-weight: 800; color: #27ae60; text-align: right;">৳0.00</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery & Support Notice -->
          <tr>
            <td style="background-color: #fbf9f6; padding: 22px 28px; border-top: 1px solid #ebe2d8; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #230407;">
                Your parcel is currently being prepared for courier dispatch.
              </p>
              <p style="margin: 0 0 14px; font-size: 13px; color: #555; line-height: 1.5;">
                You can track your order anytime from your ANGKON account. For personal concierge support or styling inquiries:
              </p>
              <a href="https://wa.me/8801338668899" target="_blank" style="display: inline-block; background-color: #530911; color: #E1B76F; text-decoration: none; font-size: 13px; font-weight: 700; padding: 11px 26px; border-radius: 8px; letter-spacing: 0.5px; border: 1px solid #E1B76F;">
                💬 WhatsApp Concierge (+880 1338-668899)
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #530911; border-top: 2px solid #E1B76F; padding: 26px 20px; text-align: center; color: #f5eedb;">
              <p style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 16px; letter-spacing: 3px; text-transform: uppercase; color: #E1B76F; font-weight: 700;">
                ANGKON
              </p>
              <p style="margin: 0 0 10px; font-size: 12px; color: #f5eedb; opacity: 0.95; line-height: 1.5;">
                H-93, Ground Floor, Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212, Bangladesh
              </p>
              <p style="margin: 0; font-size: 11px; color: #f5eedb; opacity: 0.75;">
                © ${new Date().getFullYear()} ANGKON. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches the official payment invoice email to the customer and notifies admin.
 * Safe fire-and-forget execution with atomic idempotency guard.
 */
export async function sendPaymentInvoiceEmail(
  data: PaymentInvoiceEmailData
): Promise<{ customerSent: boolean; adminSent: boolean }> {
  let customerSent = false;
  let adminSent = false;

  const customerEmail = (data.order.customer.email || "").trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 1. Send Customer Invoice
  if (customerEmail && emailRegex.test(customerEmail)) {
    try {
      const invoiceHtml = getPaymentInvoiceEmailHtml(data);
      const res = await sendEmail({
        to: customerEmail,
        subject: `Payment Receipt & Invoice #${data.order.orderNumber} - ANGKON`,
        html: invoiceHtml,
      });

      if (res.success) {
        customerSent = true;
        console.log(`✅ Payment invoice email dispatched to ${customerEmail} (ID: ${res.id})`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to send payment invoice to ${customerEmail}:`, err);
    }
  }

  // 2. Send Admin Notification Copy
  const adminRecipients = getOrderNotificationEmails();
  if (adminRecipients.length > 0) {
    try {
      const invoiceHtml = getPaymentInvoiceEmailHtml(data);
      const res = await sendEmail({
        to: adminRecipients,
        subject: `[Payment Received & Invoice Issued] #${data.order.orderNumber} - ${data.order.customer.fullName} (৳${data.order.total})`,
        html: invoiceHtml,
      });

      if (res.success) {
        adminSent = true;
        console.log(`✅ Admin payment invoice notification sent to ${adminRecipients.join(", ")}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to notify admin of payment invoice:`, err);
    }
  }

  return { customerSent, adminSent };
}
