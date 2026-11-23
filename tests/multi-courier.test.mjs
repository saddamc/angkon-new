import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { extractSteadfastPayloadError } from "../src/server/courier/steadfast-utils.ts";
import { mapRedxStatus } from "../src/server/courier/redx-utils.ts";
import { mapEcourierStatus } from "../src/server/courier/ecourier-utils.ts";
import {
  getCourierTrackingUrl,
  getCourierLabel,
  normalizeCourierSettings,
} from "../src/server/courier/tracking.ts";

const read = (file) => fs.readFileSync(file, "utf8");

test("steadfast: flattens HTTP-200 validation payloads with Laravel errors", () => {
  const err = extractSteadfastPayloadError({
    status: 400,
    errors: {
      recipient_phone: ["The recipient phone must be 11 digits."],
      recipient_address: ["The recipient address field is required."],
    },
  });
  assert.ok(err);
  assert.equal(err.statusCode, 400);
  assert.ok(err.message.includes("recipient_phone: The recipient phone must be 11 digits."));
  assert.ok(err.message.includes("recipient_address: The recipient address field is required."));
});

test("steadfast adapter: implements status_by_invoice recovery and bulk booking", () => {
  const steadfast = read("src/server/courier/steadfast.ts");
  assert.ok(steadfast.includes("extractSteadfastPayloadError"));
  assert.ok(steadfast.includes("getSteadfastStatusByInvoice"));
  assert.ok(steadfast.includes("/status_by_invoice/"));
  assert.ok(steadfast.includes("createBulkSteadfastShipments"));
  assert.ok(steadfast.includes("/create_order/bulk-order"));
});

test("redx and ecourier status mapping normalize onto ShipmentStatus", () => {
  assert.equal(mapRedxStatus("ready-for-delivery"), "created");
  assert.equal(mapRedxStatus("pickup-in-progress"), "in_transit");
  assert.equal(mapRedxStatus("delivery-in-progress"), "out_for_delivery");
  assert.equal(mapRedxStatus("delivered"), "delivered");
  assert.equal(mapRedxStatus("returned"), "returned");
  assert.equal(mapRedxStatus("cancelled"), "cancelled");

  assert.equal(mapEcourierStatus("Placed"), "created");
  assert.equal(mapEcourierStatus("Picked Up"), "in_transit");
  assert.equal(mapEcourierStatus("Delivered"), "delivered");
  assert.equal(mapEcourierStatus("Returned"), "returned");
  assert.equal(mapEcourierStatus("Hold"), "hold");
});

test("tracking urls and labels work across Steadfast, Pathao, RedX, and eCourier", () => {
  assert.equal(
    getCourierTrackingUrl("steadfast", "SF123"),
    "https://steadfast.com.bd/t/SF123"
  );
  assert.equal(
    getCourierTrackingUrl("pathao", null, "PA999"),
    "https://merchant.pathao.com/tracking?consignment_id=PA999"
  );
  assert.equal(
    getCourierTrackingUrl("redx", "RX777"),
    "https://redx.com.bd/track-global-parcel/?trackingId=RX777"
  );
  assert.equal(
    getCourierTrackingUrl("ecourier", "EC555"),
    "https://ecourier.com.bd/tracking/?tracking_no=EC555"
  );
  assert.equal(getCourierLabel("redx"), "RedX");
});

test("multi-courier registry, shipment model, and webhooks cover all 4 providers fail-closed", () => {
  const index = read("src/server/courier/index.ts");
  const shipmentModel = read("src/models/Shipment.ts");
  const webhookHandler = read("src/server/courier/webhook-handler.ts");
  const pathaoWh = read("src/app/api/webhooks/pathao/route.ts");
  const redxWh = read("src/app/api/webhooks/redx/route.ts");
  const ecourierWh = read("src/app/api/webhooks/ecourier/route.ts");

  assert.ok(index.includes('case "redx":'));
  assert.ok(index.includes('case "ecourier":'));
  assert.ok(shipmentModel.includes('"redx"'));
  assert.ok(shipmentModel.includes('"ecourier"'));
  assert.ok(webhookHandler.includes("timingSafeEqual"));
  assert.ok(webhookHandler.includes("adapter.getStatus"));
  assert.ok(webhookHandler.includes("applyCourierStatus"));
  assert.ok(pathaoWh.includes("PATHAO_WEBHOOK_SECRET"));
  assert.ok(redxWh.includes("REDX_WEBHOOK_SECRET"));
  assert.ok(ecourierWh.includes("ECOURIER_WEBHOOK_SECRET"));
});

test("shipment route enforces unpaid online protection and audited recipient editing", () => {
  const shipmentRoute = read("src/app/api/admin/orders/[id]/shipment/route.ts");
  const courierService = read("src/server/courier/courier-service.ts");
  assert.ok(shipmentRoute.includes("courierService.bookShipment"));
  assert.ok(courierService.includes("UNPAID_ONLINE_ORDER"));
  assert.ok(courierService.includes("allowCodFallback"));
  assert.ok(courierService.includes("order.delivery.unpaid_online_cod_override"));
  assert.ok(courierService.includes("order.recipient.update"));
  assert.ok(shipmentRoute.includes("providerMeta"));
});

test("courier settings normalize defaults safely and credentials stay server-only", () => {
  const defaults = normalizeCourierSettings({});
  assert.equal(defaults.defaultProvider, "steadfast");
  assert.equal(defaults.autoAdvanceToShipped, true);
  assert.equal(defaults.allowUnpaidOnlineShipment, false);
  assert.equal(defaults.autoBookOnConfirm, false);

  const envExample = read(".env.example");
  assert.ok(envExample.includes("REDX_API_TOKEN"));
  assert.ok(envExample.includes("ECOURIER_API_KEY"));
  assert.ok(envExample.includes("PATHAO_WEBHOOK_SECRET"));
  assert.ok(!envExample.includes("NEXT_PUBLIC_REDX"));
  assert.ok(!envExample.includes("NEXT_PUBLIC_ECOURIER"));
});

test("redx scaffold: architecture, fail-closed gate, and capability flags", () => {
  // Dedicated files exist
  assert.ok(fs.existsSync("src/server/courier/redx/types.ts"), "types.ts must exist");
  assert.ok(fs.existsSync("src/server/courier/redx/mapper.ts"), "mapper.ts must exist");
  assert.ok(fs.existsSync("src/server/courier/redx/webhook.ts"), "webhook.ts must exist");
  assert.ok(fs.existsSync("src/server/courier/redx/redx.ts"), "redx.ts must exist");

  const typesContent = read("src/server/courier/redx/types.ts");
  const mapperContent = read("src/server/courier/redx/mapper.ts");
  const webhookContent = read("src/server/courier/redx/webhook.ts");
  const redxContent = read("src/server/courier/redx/redx.ts");

  // Capability flags in types.ts
  assert.ok(typesContent.includes("hasWeightRequirement: true"));
  assert.ok(typesContent.includes("supportsTrackingWebhook: true"));
  assert.ok(typesContent.includes("supportsCodSettlement: true"));
  assert.ok(typesContent.includes("supportsAreaSelection: true"));

  // Fail-closed createShipment gate in redx.ts
  assert.ok(redxContent.includes('readonly provider = "redx"'));
  assert.ok(redxContent.includes('code: "not-configured"'));
  assert.ok(redxContent.includes("Setup is required"));

  // Webhook verification fail-closed in webhook.ts
  assert.ok(webhookContent.includes("REDX_WEBHOOK_SECRET"));
  assert.ok(webhookContent.includes("timingSafeEqual"));
  assert.ok(webhookContent.includes("valid: false"));

  // Pure mapper functions in mapper.ts
  assert.ok(mapperContent.includes("mapRedxStatus"));
  assert.ok(mapperContent.includes("mapRedxCreatePayload"));
  assert.ok(mapperContent.includes("mapRedxResponse"));
  assert.ok(mapperContent.includes("merchantInvoiceId"));
});

test("shipment modal & courier settings: multi-provider cards and footer non-wrapping", () => {
  const modalSource = read("src/app/admin/orders/_components/orders-modals.tsx");
  const settingsSource = read("src/app/admin/settings/courier-settings.tsx");

  // Booking modal is Steadfast-only; upcoming providers live in courier settings
  assert.ok(modalSource.includes("Steadfast"), "Modal must show Steadfast");
  assert.ok(settingsSource.includes("Pathao"), "Courier settings must list Pathao");
  assert.ok(settingsSource.includes("RedX"), "Courier settings must list RedX");

  // Booking form sections
  assert.ok(modalSource.includes("Parcel classification"));
  assert.ok(modalSource.includes("Products Weight"));
  assert.ok(modalSource.includes("Packaging Allowance"));
  assert.ok(modalSource.includes("Final Package Weight"));
  assert.ok(modalSource.includes("Booking Time & Last Sync"));

  // Modal footer single-line non-wrapping layout
  assert.ok(modalSource.includes("whitespace-nowrap"));

  // Settings UI has 3 dedicated cards
  assert.ok(settingsSource.includes("Integrated Courier Providers"));
  assert.ok(settingsSource.includes("Steadfast Courier"));
  assert.ok(settingsSource.includes("Pathao Courier"));
  assert.ok(settingsSource.includes("RedX Courier"));
  assert.ok(settingsSource.includes("Setup Required"));
  assert.ok(settingsSource.includes("Pending Official Docs"));
});
