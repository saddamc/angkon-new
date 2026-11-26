import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface InvoicePdfItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface InvoicePdfPaymentRef {
  provider?: string | null;
  status?: string | null;
  tranId?: string | null;
  valId?: string | null;
  bankTranId?: string | null;
  cardType?: string | null;
  cardBrand?: string | null;
  cardIssuer?: string | null;
  paidAt?: Date | string | null;
}

export interface InvoicePdfInput {
  orderNumber: string;
  createdAt?: Date | string | null;
  orderStatus?: string | null;
  paymentMethod: string;
  paymentStatus?: string | null;
  paidAmount?: number | null;
  expectedCodAmount?: number | null;
  subtotal: number;
  shippingFee: number;
  discount?: number | null;
  promoCode?: string | null;
  total: number;
  refundedAmount?: number | null;
  courier?: string | null;
  trackingCode?: string | null;
  consignmentId?: string | null;
  notes?: string | null;
  customer: {
    fullName: string;
    email?: string | null;
    phone: string;
    address: string;
    city?: string | null;
    district: string;
    postalCode?: string | null;
  };
  items: InvoicePdfItem[];
  payment?: InvoicePdfPaymentRef | null;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_X = 42;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_X * 2;

const COLOR_MAROON = rgb(0.325, 0.035, 0.067); // #530911
const COLOR_GOLD = rgb(0.882, 0.718, 0.435); // #E1B76F
const COLOR_DARK = rgb(0.14, 0.08, 0.09);
const COLOR_MUTED = rgb(0.42, 0.39, 0.37);
const COLOR_BORDER = rgb(0.88, 0.84, 0.79);
const COLOR_BG_SOFT = rgb(0.985, 0.975, 0.96);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_GREEN = rgb(0.08, 0.47, 0.24);
const COLOR_GREEN_BG = rgb(0.92, 0.98, 0.94);
const COLOR_AMBER = rgb(0.71, 0.33, 0.04);
const COLOR_AMBER_BG = rgb(0.996, 0.96, 0.9);

/**
 * Normalizes arbitrary customer/product text to WinAnsi-safe ASCII/Latin-1
 * so pdf-lib standard fonts never throw on emojis or Bengali glyphs.
 */
export function toPdfSafeText(input: unknown): string {
  const raw = String(input ?? "");
  return raw
    .replace(/\u09F3/g, "BDT ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, "*")
    .replace(/\s+/g, " ")
    // Keep printable ASCII and Latin-1 WinAnsi characters only
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

export function formatPdfCurrency(amount: number): string {
  const num = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `BDT ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPdfDate(value?: Date | string | null): string {
  if (!value) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Dhaka",
    });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return toPdfSafeText(value);
  }
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const clean = toPdfSafeText(text);
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Handle single overlong word
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let slice = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(slice + ch, fontSize) > maxWidth) {
            if (slice) lines.push(slice);
            slice = ch;
          } else {
            slice += ch;
          }
        }
        current = slice;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function resolvePaymentModeLabel(method: string): string {
  const m = String(method || "").trim().toLowerCase();
  if (m === "cod") return "Cash on Delivery (COD)";
  if (m === "bkash") return "bKash (via SSLCOMMERZ)";
  if (m === "nagad") return "Nagad (via SSLCOMMERZ)";
  if (m === "sslcommerz" || m === "online") return "Online Payment (SSLCOMMERZ)";
  return toPdfSafeText(method).toUpperCase() || "Cash on Delivery";
}

/**
 * Generates an official A4 PDF invoice from immutable order & verified payment snapshots.
 * Shared by both email attachments and authenticated customer/admin downloads.
 */
export async function generateOrderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`ANGKON Invoice ${toPdfSafeText(input.orderNumber)}`);
  pdfDoc.setAuthor("ANGKON Luxury Apparel");
  pdfDoc.setSubject(`Official Tax Invoice INV-${toPdfSafeText(input.orderNumber)}`);
  pdfDoc.setCreator("ANGKON Invoice Engine");

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const paymentStatus = String(input.paymentStatus || "pending").trim().toLowerCase();
  const isCod = String(input.paymentMethod || "").trim().toLowerCase() === "cod";
  const isRefunded = paymentStatus === "refunded";
  const isPartiallyRefunded = paymentStatus === "partially_refunded";
  const paidAmount =
    input.paidAmount !== null && input.paidAmount !== undefined
      ? Number(input.paidAmount)
      : paymentStatus === "paid" || isRefunded || isPartiallyRefunded
      ? Number(input.total)
      : 0;
  const refundedAmount = Math.max(0, Number(input.refundedAmount || 0));
  const isPaid =
    paymentStatus === "paid" ||
    isRefunded ||
    isPartiallyRefunded ||
    (!isCod && paidAmount >= Number(input.total) && Number(input.total) > 0);
  const balanceDue = Math.max(
    0,
    isCod && !isPaid
      ? Number(input.expectedCodAmount ?? input.total - paidAmount)
      : Number(input.total) - paidAmount
  );

  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT;

  // ── 1. Brand Header Banner ──
  const bannerHeight = 76;
  page.drawRectangle({
    x: 0,
    y: A4_HEIGHT - bannerHeight,
    width: A4_WIDTH,
    height: bannerHeight,
    color: COLOR_MAROON,
  });
  page.drawRectangle({
    x: 0,
    y: A4_HEIGHT - bannerHeight - 3,
    width: A4_WIDTH,
    height: 3,
    color: COLOR_GOLD,
  });

  page.drawText("ANGKON", {
    x: MARGIN_X,
    y: A4_HEIGHT - 36,
    size: 22,
    font: fontBold,
    color: COLOR_GOLD,
  });
  page.drawText("AUTHENTIC ETHNIC LUXURY APPAREL", {
    x: MARGIN_X,
    y: A4_HEIGHT - 51,
    size: 8.5,
    font: fontBold,
    color: COLOR_WHITE,
  });
  page.drawText("H-93, Ground Floor, Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212 | +880 1338-668899", {
    x: MARGIN_X,
    y: A4_HEIGHT - 64,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.95, 0.9, 0.85),
  });

  // Right-side Invoice Title
  const invLabel = `INV-${toPdfSafeText(input.orderNumber)}`;
  const invWidth = fontMono.widthOfTextAtSize(invLabel, 11);
  page.drawText("OFFICIAL TAX INVOICE", {
    x: A4_WIDTH - MARGIN_X - fontBold.widthOfTextAtSize("OFFICIAL TAX INVOICE", 9.5),
    y: A4_HEIGHT - 32,
    size: 9.5,
    font: fontBold,
    color: COLOR_GOLD,
  });
  page.drawText(invLabel, {
    x: A4_WIDTH - MARGIN_X - invWidth,
    y: A4_HEIGHT - 48,
    size: 11,
    font: fontMono,
    color: COLOR_WHITE,
  });
  const dateText = `Issued: ${formatPdfDate(input.payment?.paidAt || input.createdAt)}`;
  page.drawText(dateText, {
    x: A4_WIDTH - MARGIN_X - fontRegular.widthOfTextAtSize(dateText, 8),
    y: A4_HEIGHT - 62,
    size: 8,
    font: fontRegular,
    color: rgb(0.95, 0.9, 0.85),
  });

  y = A4_HEIGHT - bannerHeight - 24;

  // ── 2. Payment Status Banner Strip ──
  const badgeText = isRefunded
    ? "REFUNDED"
    : isPartiallyRefunded
    ? "PARTIALLY REFUNDED"
    : isPaid
    ? "PAID IN FULL - VERIFIED"
    : isCod
    ? "CASH ON DELIVERY - PAYMENT DUE ON DELIVERY"
    : "PAYMENT PENDING";

  const badgeBg = isPaid && !isRefunded && !isPartiallyRefunded ? COLOR_GREEN_BG : COLOR_AMBER_BG;
  const badgeFg = isPaid && !isRefunded && !isPartiallyRefunded ? COLOR_GREEN : COLOR_AMBER;

  page.drawRectangle({
    x: MARGIN_X,
    y: y - 26,
    width: CONTENT_WIDTH,
    height: 26,
    color: badgeBg,
    borderColor: badgeFg,
    borderWidth: 1,
  });
  page.drawText(badgeText, {
    x: MARGIN_X + 10,
    y: y - 16.5,
    size: 9.5,
    font: fontBold,
    color: badgeFg,
  });

  const dueSummary =
    isCod && !isPaid
      ? `Collectible on Delivery: ${formatPdfCurrency(balanceDue)}`
      : `Balance Due: ${formatPdfCurrency(balanceDue)}`;
  page.drawText(dueSummary, {
    x: A4_WIDTH - MARGIN_X - 10 - fontBold.widthOfTextAtSize(dueSummary, 9.5),
    y: y - 16.5,
    size: 9.5,
    font: fontBold,
    color: badgeFg,
  });

  y -= 42;

  // ── 3. Customer & Order / Payment Details Two-Column Box ──
  const colGap = 16;
  const colWidth = (CONTENT_WIDTH - colGap) / 2;
  const leftLines: Array<{ text: string; bold?: boolean; mono?: boolean }> = [
    { text: toPdfSafeText(input.customer.fullName), bold: true },
    { text: `Phone: ${toPdfSafeText(input.customer.phone)}` },
    ...(input.customer.email ? [{ text: `Email: ${toPdfSafeText(input.customer.email)}` }] : []),
    ...wrapText(
      [
        input.customer.address,
        input.customer.city,
        input.customer.district,
        input.customer.postalCode ? `(${input.customer.postalCode})` : "",
      ]
        .filter(Boolean)
        .join(", "),
      fontRegular,
      8.5,
      colWidth - 20
    ).map((l) => ({ text: l })),
  ];

  const rightLines: Array<{ text: string; bold?: boolean; mono?: boolean }> = [
    { text: `Order Reference: #${toPdfSafeText(input.orderNumber)}`, bold: true },
    { text: `Payment Method: ${resolvePaymentModeLabel(input.paymentMethod)}` },
    {
      text: `Payment Status: ${
        isPaid ? (isRefunded ? "Refunded" : isPartiallyRefunded ? "Partially Refunded" : "Paid") : isCod ? "Due on Delivery (COD)" : "Pending"
      }`,
    },
  ];

  // Include verified SSLCOMMERZ references ONLY when real values exist (never fabricated)
  if (input.payment?.tranId) {
    rightLines.push({ text: `Merchant TXN ID: ${toPdfSafeText(input.payment.tranId)}`, mono: true });
  }
  if (input.payment?.valId) {
    rightLines.push({ text: `Validation ID: ${toPdfSafeText(input.payment.valId)}`, mono: true });
  }
  if (input.payment?.bankTranId) {
    rightLines.push({ text: `Bank TXN ID: ${toPdfSafeText(input.payment.bankTranId)}`, mono: true });
  }
  if (input.payment?.cardType || input.payment?.cardIssuer) {
    const channel = [input.payment.cardType, input.payment.cardIssuer].filter(Boolean).join(" / ");
    rightLines.push({ text: `Channel: ${toPdfSafeText(channel)}` });
  }
  if (input.courier || input.trackingCode || input.consignmentId) {
    rightLines.push({
      text: `Courier: ${toPdfSafeText(input.courier || "Assigned")}${
        input.trackingCode || input.consignmentId
          ? ` (${toPdfSafeText(input.trackingCode || input.consignmentId)})`
          : ""
      }`,
    });
  }

  const boxHeight = Math.max(leftLines.length, rightLines.length) * 12 + 34;

  page.drawRectangle({
    x: MARGIN_X,
    y: y - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: COLOR_BG_SOFT,
    borderColor: COLOR_BORDER,
    borderWidth: 0.75,
  });
  page.drawLine({
    start: { x: MARGIN_X + colWidth + colGap / 2, y: y - 8 },
    end: { x: MARGIN_X + colWidth + colGap / 2, y: y - boxHeight + 8 },
    thickness: 0.75,
    color: COLOR_BORDER,
  });

  page.drawText("BILLED & DELIVERED TO", {
    x: MARGIN_X + 10,
    y: y - 16,
    size: 8,
    font: fontBold,
    color: COLOR_MAROON,
  });
  page.drawText("ORDER & PAYMENT DETAILS", {
    x: MARGIN_X + colWidth + colGap + 10,
    y: y - 16,
    size: 8,
    font: fontBold,
    color: COLOR_MAROON,
  });

  leftLines.forEach((line, idx) => {
    page.drawText(line.text, {
      x: MARGIN_X + 10,
      y: y - 30 - idx * 12,
      size: 8.5,
      font: line.mono ? fontMono : line.bold ? fontBold : fontRegular,
      color: line.bold ? COLOR_DARK : COLOR_MUTED,
    });
  });

  rightLines.forEach((line, idx) => {
    page.drawText(line.text, {
      x: MARGIN_X + colWidth + colGap + 10,
      y: y - 30 - idx * 12,
      size: 8.2,
      font: line.mono ? fontMono : line.bold ? fontBold : fontRegular,
      color: line.bold ? COLOR_DARK : COLOR_MUTED,
    });
  });

  y -= boxHeight + 20;

  // ── 4. Line Items Table (Multi-Page Safe) ──
  const drawTableHeader = (targetPage: PDFPage, topY: number): number => {
    targetPage.drawRectangle({
      x: MARGIN_X,
      y: topY - 22,
      width: CONTENT_WIDTH,
      height: 22,
      color: COLOR_MAROON,
    });
    targetPage.drawText("ITEM DESCRIPTION", {
      x: MARGIN_X + 8,
      y: topY - 14.5,
      size: 8,
      font: fontBold,
      color: COLOR_GOLD,
    });
    targetPage.drawText("QTY", {
      x: MARGIN_X + 315,
      y: topY - 14.5,
      size: 8,
      font: fontBold,
      color: COLOR_GOLD,
    });
    targetPage.drawText("UNIT PRICE", {
      x: MARGIN_X + 365,
      y: topY - 14.5,
      size: 8,
      font: fontBold,
      color: COLOR_GOLD,
    });
    targetPage.drawText("TOTAL", {
      x: A4_WIDTH - MARGIN_X - 8 - fontBold.widthOfTextAtSize("TOTAL", 8),
      y: topY - 14.5,
      size: 8,
      font: fontBold,
      color: COLOR_GOLD,
    });
    return topY - 22;
  };

  y = drawTableHeader(page, y);

  for (const item of input.items) {
    const nameLines = wrapText(item.name || "Collection Item", fontBold, 9, 285);
    const variantParts = [
      item.size ? `Size: ${toPdfSafeText(item.size)}` : "",
      item.color ? `Color: ${toPdfSafeText(item.color)}` : "",
    ].filter(Boolean);
    const variantLine = variantParts.join(" | ");
    const rowHeight = Math.max(26, nameLines.length * 11 + (variantLine ? 12 : 0) + 10);

    if (y - rowHeight < 140) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      y = A4_HEIGHT - 44;
      y = drawTableHeader(page, y);
    }

    nameLines.forEach((nl, i) => {
      page.drawText(nl, {
        x: MARGIN_X + 8,
        y: y - 13 - i * 11,
        size: 9,
        font: fontBold,
        color: COLOR_DARK,
      });
    });

    if (variantLine) {
      page.drawText(variantLine, {
        x: MARGIN_X + 8,
        y: y - 13 - nameLines.length * 11,
        size: 7.8,
        font: fontRegular,
        color: COLOR_MUTED,
      });
    }

    const qtyStr = String(item.quantity || 1);
    const unitStr = formatPdfCurrency(item.price || 0);
    const lineTotalStr = formatPdfCurrency((item.price || 0) * (item.quantity || 1));

    page.drawText(qtyStr, {
      x: MARGIN_X + 320,
      y: y - 14,
      size: 9,
      font: fontRegular,
      color: COLOR_DARK,
    });
    page.drawText(unitStr, {
      x: MARGIN_X + 365,
      y: y - 14,
      size: 8.5,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    page.drawText(lineTotalStr, {
      x: A4_WIDTH - MARGIN_X - 8 - fontBold.widthOfTextAtSize(lineTotalStr, 9),
      y: y - 14,
      size: 9,
      font: fontBold,
      color: COLOR_DARK,
    });

    y -= rowHeight;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: A4_WIDTH - MARGIN_X, y },
      thickness: 0.5,
      color: COLOR_BORDER,
    });
  }

  // ── 5. Totals Breakdown & Terms ──
  if (y < 180) {
    page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    y = A4_HEIGHT - 48;
  }

  y -= 18;
  const summaryWidth = 230;
  const summaryX = A4_WIDTH - MARGIN_X - summaryWidth;
  const discountVal = Math.max(0, Number(input.discount || 0));
  const subtotalVal = Number(input.subtotal ?? input.total - (input.shippingFee || 0) + discountVal);

  const summaryRows: Array<{ label: string; value: string; bold?: boolean; accent?: "green" | "amber" | "maroon" }> = [
    { label: "Subtotal", value: formatPdfCurrency(subtotalVal) },
    {
      label: `Delivery Fee (${toPdfSafeText(input.customer.district || "Standard")})`,
      value: Number(input.shippingFee || 0) === 0 ? "Free" : formatPdfCurrency(input.shippingFee || 0),
    },
  ];
  if (discountVal > 0) {
    summaryRows.push({
      label: `Discount${input.promoCode ? ` (${toPdfSafeText(input.promoCode)})` : ""}`,
      value: `-${formatPdfCurrency(discountVal)}`,
      accent: "green",
    });
  }
  summaryRows.push({
    label: "Grand Total",
    value: formatPdfCurrency(input.total),
    bold: true,
    accent: "maroon",
  });
  summaryRows.push({
    label: "Amount Paid",
    value: formatPdfCurrency(paidAmount),
    bold: true,
    accent: paidAmount > 0 ? "green" : undefined,
  });
  if (refundedAmount > 0) {
    summaryRows.push({
      label: "Refunded Amount",
      value: `-${formatPdfCurrency(refundedAmount)}`,
      bold: true,
      accent: "amber",
    });
  }
  summaryRows.push({
    label: isCod && !isPaid ? "Payment Due on Delivery" : "Balance Due",
    value: formatPdfCurrency(balanceDue),
    bold: true,
    accent: balanceDue > 0 ? "amber" : "green",
  });

  // Left-side Terms & Notes
  page.drawText("Notice & Exchange Policy", {
    x: MARGIN_X,
    y,
    size: 8.5,
    font: fontBold,
    color: COLOR_MAROON,
  });
  const noticeLines = wrapText(
    "Goods once sold can be exchanged within 7 days in original unused condition with tags intact. Please retain this official invoice for customer support and returns.",
    fontRegular,
    7.8,
    240
  );
  noticeLines.forEach((nl, i) => {
    page.drawText(nl, {
      x: MARGIN_X,
      y: y - 13 - i * 10.5,
      size: 7.8,
      font: fontRegular,
      color: COLOR_MUTED,
    });
  });

  if (input.notes) {
    const noteTop = y - 16 - noticeLines.length * 10.5;
    const noteLines = wrapText(`Customer Note: ${input.notes}`, fontRegular, 7.8, 240);
    noteLines.slice(0, 3).forEach((nl, i) => {
      page.drawText(nl, {
        x: MARGIN_X,
        y: noteTop - i * 10.5,
        size: 7.8,
        font: fontRegular,
        color: COLOR_MUTED,
      });
    });
  }

  let sy = y;
  for (const row of summaryRows) {
    const color =
      row.accent === "green"
        ? COLOR_GREEN
        : row.accent === "amber"
        ? COLOR_AMBER
        : row.accent === "maroon"
        ? COLOR_MAROON
        : COLOR_DARK;
    const f = row.bold ? fontBold : fontRegular;
    const sz = row.bold ? 9.5 : 8.5;

    if (row.label === "Grand Total") {
      page.drawLine({
        start: { x: summaryX, y: sy + 9 },
        end: { x: A4_WIDTH - MARGIN_X, y: sy + 9 },
        thickness: 1,
        color: COLOR_MAROON,
      });
    }

    page.drawText(row.label, { x: summaryX, y: sy, size: sz, font: f, color });
    page.drawText(row.value, {
      x: A4_WIDTH - MARGIN_X - f.widthOfTextAtSize(row.value, sz),
      y: sy,
      size: sz,
      font: f,
      color,
    });
    sy -= 15;
  }

  // ── 6. Footer ──
  page.drawLine({
    start: { x: MARGIN_X, y: 42 },
    end: { x: A4_WIDTH - MARGIN_X, y: 42 },
    thickness: 0.75,
    color: COLOR_GOLD,
  });
  page.drawText("Official Computer-Generated Invoice * ANGKON * https://angkon.net", {
    x: MARGIN_X,
    y: 28,
    size: 7.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
