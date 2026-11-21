import type { ShipmentRecord, WCOrder } from "../_types/orders.types";
import { getCourierLabel } from "@/server/courier/tracking";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Generates a pseudo SVG barcode representation for thermal scanning */
function generateBarcodeSvg(value: string): string {
  if (!value) return "";
  const bars: string[] = [];
  let x = 10;
  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    const pattern = (charCode % 5) + 1;
    for (let p = 0; p < pattern; p++) {
      const width = ((charCode + p) % 3 === 0) ? 3 : 1.5;
      bars.push(`<rect x="${x}" y="0" width="${width}" height="42" fill="#000" />`);
      x += width + 2;
    }
  }
  return `<svg width="${Math.max(240, x + 10)}" height="46" xmlns="http://www.w3.org/2000/svg">${bars.join("")}</svg>`;
}

/** Opens a print-friendly 4x6-style courier packing slip for the order. */
export function printCourierLabel(order: WCOrder, shipment?: ShipmentRecord | null) {
  if (typeof window === "undefined") return;
  const courier = shipment?.provider || order.courier || "Courier";
  const tracking = shipment?.trackingCode || order.trackingCode || "";
  const consignment = shipment?.consignmentId || order.consignmentId || "";
  const recipientName =
    shipment?.recipientName ||
    [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ") ||
    "Guest";
  const recipientPhone = shipment?.recipientPhone || order.billing?.phone || "—";
  const recipientAddress =
    shipment?.recipientAddress ||
    [order.billing?.address_1, order.billing?.city].filter(Boolean).join(", ") ||
    "—";
  const isPaid = (order.payment_status || order.paymentStatus) === "paid";
  const cod = shipment ? shipment.codAmount : isPaid ? 0 : Math.round(Number(order.total) || 0);
  const paymentChannel = (order.paymentMethod || "COD").toUpperCase();

  const itemsHtml = (order.line_items || [])
    .map(
      (it) =>
        `<tr><td style="font-weight:600;">${esc(it.name)}${it.size ? ` (${esc(it.size)})` : ""}</td><td style="text-align:right;font-weight:700;">× ${esc(it.quantity)}</td></tr>`
    )
    .join("");

  const trackingBarcode = tracking ? generateBarcodeSvg(tracking) : generateBarcodeSvg(String(order.number || order.id));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shipping Label #${esc(order.number || order.id)}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { margin: 0; padding: 12px; color: #000; background: #fff; }
    .label { width: 380px; margin: 0 auto; border: 2.5px solid #000; padding: 14px; border-radius: 6px; }
    .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .brand { font-size: 20px; font-weight: 900; letter-spacing: 0.1em; }
    .courier { font-size: 13px; font-weight: 800; text-transform: uppercase; background: #000; color: #fff; padding: 4px 10px; border-radius: 4px; }
    .row { margin-bottom: 8px; font-size: 12.5px; line-height: 1.4; }
    .muted { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #444; letter-spacing: 0.05em; }
    .big { font-size: 16px; font-weight: 800; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; }
    
    /* Dynamic Payment Box */
    .pay-box { padding: 10px 12px; border-radius: 6px; margin: 10px 0; }
    .pay-cod { border: 2.5px solid #000; background: #fafafa; }
    .pay-prepaid { border: 2.5px solid #000; background: #000; color: #fff; text-align: center; }
    .pay-prepaid .muted { color: #ddd; }
    
    .barcode-wrap { text-align: center; margin: 6px 0; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
    td { padding: 4px 0; border-top: 1px dashed #bbb; }
    
    @media print { 
      body { padding: 0; } 
      .label { border-width: 2px; width: 100%; max-width: 380px; } 
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="head">
      <div>
        <span class="brand">ANGKON</span>
        <div style="font-size:9.5px;font-weight:600;color:#555;">PREMIUM APPAREL</div>
      </div>
      <span class="courier">${esc(getCourierLabel(courier))}</span>
    </div>

    <div class="row" style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div class="muted">Order Invoice</div>
        <div class="mono big">#${esc(order.number || order.id)}</div>
      </div>
      ${consignment ? `<div style="text-align:right"><div class="muted">Consignment ID</div><div class="mono" style="font-size:13px;">${esc(consignment)}</div></div>` : ""}
    </div>

    ${tracking ? `
      <div class="barcode-wrap">
        ${trackingBarcode}
        <div class="mono" style="font-size:12px;letter-spacing:0.15em;">${esc(tracking)}</div>
      </div>
    ` : ""}

    <div class="row" style="border-top:1.5px solid #000;padding-top:8px;">
      <div class="muted">Recipient Delivery Address</div>
      <div class="big" style="margin-top:2px;">${esc(recipientName)}</div>
      <div class="mono big" style="margin:2px 0;">${esc(recipientPhone)}</div>
      <div style="font-size:13px;line-height:1.35;">${esc(recipientAddress)}</div>
    </div>

    ${cod > 0 ? `
      <div class="pay-box pay-cod">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="muted">Payment Method: ${esc(paymentChannel)}</div>
            <div style="font-size:11px;font-weight:800;color:#c00;">COLLECT CASH FROM CUSTOMER</div>
          </div>
          <div style="text-align:right;">
            <div class="muted">Collect Amount</div>
            <div class="mono" style="font-size:22px;font-weight:900;">৳ ${cod.toLocaleString("en-BD")}</div>
          </div>
        </div>
      </div>
    ` : `
      <div class="pay-box pay-prepaid">
        <div style="font-size:14px;font-weight:900;letter-spacing:0.05em;margin-bottom:2px;">
          ★ PAID ONLINE — DO NOT COLLECT CASH ★
        </div>
        <div style="font-size:11px;font-weight:600;">
          Settled via ${esc(paymentChannel)} · Collect Amount: ৳ 0
        </div>
      </div>
    `}

    <div style="border-top:1px solid #000;padding-top:6px;">
      <div class="muted" style="display:flex;justify-content:space-between;">
        <span>Item Details</span>
        <span>Quantity</span>
      </div>
      <table>${itemsHtml}</table>
    </div>

    <div style="margin-top:10px;padding-top:6px;border-top:1px dashed #ccc;text-align:center;font-size:9.5px;color:#666;">
      Support: info@angkon.com.bd · Return if damaged or recipient unavailable
    </div>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=460,height=640");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
