export interface EmailOrderItem {
  productId: number;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
}

export interface EmailOrderData {
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
  items: EmailOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  createdAt?: Date | string;
}

function formatPrice(amount: number): string {
  return `৳${Number(amount || 0).toLocaleString("en-BD")}`;
}

export function getCustomerOrderEmailHtml(order: EmailOrderData): string {
  const isInsideDhaka =
    (order.customer.district || "").trim().toLowerCase() === "dhaka" ||
    (order.customer.district || "").trim().toLowerCase() === "dhaka city";
  const deliveryTime = isInsideDhaka ? "24–48 Hours" : "3–5 Business Days";
  const paymentTitle =
    order.paymentMethod === "sslcommerz" || order.paymentMethod === "online"
      ? "Online Payment"
      : "Cash on Delivery (COD)";

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 14px 12px; border-bottom: 1px solid #f0e6dd; vertical-align: middle; width: 64px;">
        ${
          item.image
            ? `<img src="${item.image}" alt="${item.name}" width="54" height="72" style="width: 54px; height: 72px; max-width: 54px; max-height: 72px; border-radius: 4px; object-fit: cover; object-position: top; display: block; border: 1px solid #e8dfd6;" />`
            : `<div style="width: 54px; height: 72px; background: #400604; border-radius: 4px; display: inline-block; border: 1px solid #e8dfd6;"></div>`
        }
      </td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #f0e6dd; vertical-align: middle;">
        <div style="font-weight: 600; font-size: 14px; color: #1a0302; margin-bottom: 3px;">
          ${item.name}
        </div>
        ${
          item.size
            ? `<span style="display: inline-block; font-size: 11px; background: #f7ede2; color: #400604; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid #e6ccb2;">Size: ${item.size}</span>`
            : ""
        }
      </td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #f0e6dd; vertical-align: middle; text-align: center; font-size: 14px; color: #555;">
        ${item.quantity}
      </td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #f0e6dd; vertical-align: middle; text-align: right; font-weight: 600; font-size: 14px; color: #400604;">
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
  <title>Order Confirmation - ANGKON</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f3ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d2a26;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f3ee; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(64, 6, 4, 0.08); border: 1px solid #ebe2d8;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #400604; padding: 36px 24px; text-align: center; border-bottom: 3px solid #E1B76F;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 32px; letter-spacing: 5px; color: #E1B76F; font-weight: 700; text-transform: uppercase;">
                ANGKON
              </h1>
              <p style="margin: 6px 0 0; color: #f5eedb; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; opacity: 0.9;">
                The Art of Elegance & Luxury
              </p>
            </td>
          </tr>

          <!-- Thank You Message -->
          <tr>
            <td style="padding: 32px 28px 20px; text-align: center;">
              <div style="display: inline-block; background-color: #fcf6eb; border: 1px solid #E1B76F; border-radius: 20px; padding: 6px 18px; margin-bottom: 16px;">
                <span style="color: #400604; font-size: 13px; font-weight: 600; letter-spacing: 1px;">
                  ORDER CONFIRMED
                </span>
              </div>
              <h2 style="margin: 0 0 10px; font-family: Georgia, serif; font-size: 24px; color: #1a0302; font-weight: 600;">
                Thank You, ${order.customer.fullName}!
              </h2>
              <p style="margin: 0 auto; max-width: 480px; font-size: 14px; line-height: 1.6; color: #5a544d;">
                We have received your order <strong>#${order.orderNumber}</strong>. Our team is carefully preparing your collection items for dispatch.
              </p>
            </td>
          </tr>

          <!-- Order Summary Meta Box -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fbf9f6; border-radius: 8px; border: 1px solid #ede4db; padding: 16px 20px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #736b63;">Order Reference:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #400604; text-align: right;">${order.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #736b63;">Payment Mode:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #1a0302; text-align: right;">${paymentTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #736b63;">Estimated Delivery:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #1a0302; text-align: right;">${deliveryTime}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #1a0302; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #400604; padding-bottom: 6px;">
                Order Items (${order.items.length})
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f4ee; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #736b63;">
                    <th style="padding: 8px 12px; text-align: left;" colspan="2">Product</th>
                    <th style="padding: 8px 12px; text-align: center;">Qty</th>
                    <th style="padding: 8px 12px; text-align: right;">Price</th>
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #ede4db; padding-top: 14px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #666;">Subtotal:</td>
                  <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #1a0302; text-align: right;">${formatPrice(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #666;">Delivery Fee (${order.customer.district}):</td>
                  <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #1a0302; text-align: right;">${order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 0; font-size: 16px; font-weight: 700; color: #400604;">Total Amount:</td>
                  <td style="padding: 12px 0 0; font-size: 18px; font-weight: 800; color: #400604; text-align: right;">${formatPrice(order.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Details Section -->
          <tr>
            <td style="background-color: #fbf9f6; padding: 24px 28px; border-top: 1px solid #ebe2d8;">
              <h4 style="margin: 0 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #400604; font-weight: 700;">
                Delivery Destination
              </h4>
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #1a0302;">${order.customer.fullName}</p>
              <p style="margin: 0 0 4px; font-size: 13px; color: #5a544d;">Phone: <strong>${order.customer.phone}</strong></p>
              <p style="margin: 0 0 4px; font-size: 13px; color: #5a544d;">Address: ${order.customer.address}, ${order.customer.district} ${order.customer.postalCode ? `(${order.customer.postalCode})` : ""}</p>
              ${
                order.notes
                  ? `<p style="margin: 8px 0 0; font-size: 12px; color: #887e74; font-style: italic;">Customer Note: "${order.notes}"</p>`
                  : ""
              }
            </td>
          </tr>

          <!-- Support & Assistance -->
          <tr>
            <td style="padding: 24px 28px; text-align: center; border-top: 1px solid #ebe2d8;">
              <p style="margin: 0 0 10px; font-size: 13px; color: #666;">
                Need help or have questions regarding your order?
              </p>
              <a href="https://wa.me/8801338668899" target="_blank" style="display: inline-block; background-color: #400604; color: #E1B76F; text-decoration: none; font-size: 13px; font-weight: 600; padding: 11px 24px; border-radius: 6px; letter-spacing: 0.5px; border: 1px solid #E1B76F;">
                💬 Contact WhatsApp Support (+880 1338-668899)
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #400604; border-top: 2px solid #E1B76F; padding: 26px 20px; text-align: center; color: #f5eedb;">
              <p style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 16px; letter-spacing: 3px; text-transform: uppercase; color: #E1B76F; font-weight: 700;">
                ANGKON
              </p>
              <p style="margin: 0 0 14px; font-size: 12px; color: #f5eedb; opacity: 0.9; line-height: 1.5;">
                H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
              </p>
              <div style="font-size: 12px;">
                <a href="https://www.facebook.com/share/19LUKov4Ei/?mibextid=wwXIfr" target="_blank" style="color: #E1B76F; text-decoration: none; margin: 0 10px; font-weight: 600;">Facebook</a> •
                <a href="https://www.instagram.com/angkon.officiall" target="_blank" style="color: #E1B76F; text-decoration: none; margin: 0 10px; font-weight: 600;">Instagram</a> •
                <a href="https://www.tiktok.com/@angkon.official" target="_blank" style="color: #E1B76F; text-decoration: none; margin: 0 10px; font-weight: 600;">TikTok</a>
              </div>
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

export function getAdminOrderEmailHtml(order: EmailOrderData): string {
  const itemsRows = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; vertical-align: middle;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="border: 0;">
          <tr>
            ${
              item.image
                ? `<td style="padding-right: 10px; vertical-align: middle;"><img src="${item.image}" alt="${item.name}" width="42" height="56" style="width: 42px; height: 56px; max-width: 42px; max-height: 56px; border-radius: 4px; object-fit: cover; object-position: top; display: block; border: 1px solid #ddd;" /></td>`
                : ""
            }
            <td style="vertical-align: middle;">
              <span style="font-weight: 600; font-size: 13px; color: #222;">${item.name}</span>
            </td>
          </tr>
        </table>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; vertical-align: middle;">${item.size || "Standard"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; font-weight: 700; vertical-align: middle;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; vertical-align: middle;">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Order Alert - ANGKON Admin</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f8; padding: 24px; color: #222;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e1e4e8; overflow: hidden;">
    
    <div style="background: #400604; color: #E1B76F; padding: 20px 24px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">🚨 NEW ORDER RECEIVED: #${order.orderNumber}</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #fff; opacity: 0.9;">Total: ${formatPrice(order.total)} | Mode: ${order.paymentMethod.toUpperCase()}</p>
    </div>

    <div style="padding: 24px;">
      
      <!-- Customer Card -->
      <div style="background: #fbfbfc; border: 1px solid #e8ebef; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px; color: #400604; font-size: 14px; text-transform: uppercase;">Customer Details</h4>
        <p style="margin: 0 0 4px; font-size: 14px;"><strong>Name:</strong> ${order.customer.fullName}</p>
        <p style="margin: 0 0 4px; font-size: 14px;"><strong>Phone:</strong> <a href="tel:${order.customer.phone}" style="color: #400604; font-weight: 700;">${order.customer.phone}</a></p>
        <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> ${order.customer.email || "Not provided"}</p>
        <p style="margin: 0 0 4px; font-size: 14px;"><strong>District:</strong> ${order.customer.district}</p>
        <p style="margin: 0; font-size: 14px;"><strong>Address:</strong> ${order.customer.address} ${order.customer.postalCode ? `(${order.customer.postalCode})` : ""}</p>
        ${
          order.notes
            ? `<p style="margin: 8px 0 0; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 13px; color: #b45309;"><strong>Note:</strong> ${order.notes}</p>`
            : ""
        }
      </div>

      <!-- Packing Items List -->
      <h4 style="margin: 0 0 10px; color: #111; font-size: 14px; text-transform: uppercase;">Items to Pack (${order.items.length})</h4>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #f0f2f5; color: #555;">
            <th style="padding: 8px 10px; text-align: left;">Product</th>
            <th style="padding: 8px 10px; text-align: center;">Size</th>
            <th style="padding: 8px 10px; text-align: center;">Qty</th>
            <th style="padding: 8px 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="border-top: 2px solid #eee; padding-top: 12px; font-size: 14px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Subtotal:</span>
          <strong>${formatPrice(order.subtotal)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Shipping Fee:</span>
          <strong>${order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 16px; color: #400604; font-weight: 800; border-top: 1px solid #ddd; padding-top: 6px;">
          <span>Total To Collect:</span>
          <span>${formatPrice(order.total)}</span>
        </div>
      </div>

    </div>

    <div style="background: #f8f9fa; border-top: 1px solid #e1e4e8; padding: 14px; text-align: center; font-size: 12px; color: #777;">
      ANGKON Automated Order Management System
    </div>

  </div>
</body>
</html>
  `.trim();
}
