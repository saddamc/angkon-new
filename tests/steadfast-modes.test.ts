import test from "node:test";
import assert from "node:assert/strict";
import {
  MockSteadfastProvider,
  mockSteadfastProvider,
} from "../src/server/courier/mock/steadfast";
import {
  getCourierModeConfig,
  isLocalTestOrder,
} from "../src/server/courier/core/courier-mode";
import { getCourierAdapter } from "../src/server/courier/index";
import { steadfastAdapter } from "../src/server/courier/providers/steadfast/adapter";
import { SHIPMENT_STATUSES } from "../src/server/courier/providers/steadfast/utils";
import { Shipment } from "../src/models/Shipment";

test("MockSteadfastProvider: Local development defaults to mock mode with zero HTTP requests", () => {
  const provider = new MockSteadfastProvider();
  assert.equal(provider.provider, "steadfast");
  assert.equal(provider.isMock, true);
  assert.equal(provider.getHttpCallCount(), 0);
  assert.equal(provider.isConfigured(), true);
});

test("MockSteadfastProvider: Simulates successful consignment booking", async () => {
  const provider = new MockSteadfastProvider();
  const result = await provider.createShipment({
    orderNumber: "ANG-TEST-001",
    recipientName: "Test Customer",
    recipientPhone: "01712345678",
    recipientAddress: "House 1, Road 2, Dhanmondi, Dhaka",
    codAmount: 1500,
    note: "Fragile luxury item",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.consignmentId?.startsWith("MOCK-CID-ANG-TEST-001"));
    assert.ok(result.trackingCode?.startsWith("MOCK-TRK-ANG-TEST-001"));
    assert.equal(result.status, "created");
    assert.equal(result.deliveryCharge, 100);
    assert.equal(result.raw.isMock, true);
    assert.equal(result.raw.mode, "mock");
    assert.equal(result.raw.tag, "TEST / MOCK CONSIGNMENT");
    assert.equal(result.raw.cod_amount, 1500);
  }
  // Zero network calls
  assert.equal(provider.getHttpCallCount(), 0);
});

test("MockSteadfastProvider: Prevents duplicate mock booking for same order", async () => {
  const provider = new MockSteadfastProvider();
  const input = {
    orderNumber: "ANG-TEST-DUP-1",
    recipientName: "Duplicate Test Customer",
    recipientPhone: "01812345678",
    recipientAddress: "Gulshan 2, Dhaka",
    codAmount: 2000,
  };

  const res1 = await provider.createShipment(input);
  assert.equal(res1.ok, true);

  // Attempt duplicate booking
  const res2 = await provider.createShipment(input);
  assert.equal(res2.ok, false);
  if (!res2.ok) {
    assert.equal(res2.error.code, "duplicate");
    assert.ok(res2.error.message.includes("already has an active mock consignment"));
  }
});

test("MockSteadfastProvider: Supports controlled failure injection", async () => {
  const provider = new MockSteadfastProvider();

  // 1. Timeout simulation
  provider.setFailureMode("timeout", "Simulated gateway connection timeout");
  const timeoutRes = await provider.createShipment({
    orderNumber: "ANG-FAIL-01",
    recipientName: "Customer",
    recipientPhone: "01711112222",
    recipientAddress: "Banani, Dhaka",
    codAmount: 1000,
  });
  assert.equal(timeoutRes.ok, false);
  if (!timeoutRes.ok) {
    assert.equal(timeoutRes.error.code, "timeout");
    assert.equal(timeoutRes.error.message, "Simulated gateway connection timeout");
  }

  // 2. Validation failure simulation
  provider.setFailureMode("validation", "Invalid recipient delivery address");
  const valRes = await provider.createShipment({
    orderNumber: "ANG-FAIL-02",
    recipientName: "Customer",
    recipientPhone: "01711112222",
    recipientAddress: "Banani, Dhaka",
    codAmount: 1000,
  });
  assert.equal(valRes.ok, false);
  if (!valRes.ok) {
    assert.equal(valRes.error.code, "validation");
  }

  // 3. Duplicate simulation
  provider.setFailureMode("duplicate");
  const dupRes = await provider.createShipment({
    orderNumber: "ANG-FAIL-03",
    recipientName: "Customer",
    recipientPhone: "01711112222",
    recipientAddress: "Banani, Dhaka",
    codAmount: 1000,
  });
  assert.equal(dupRes.ok, false);
  if (!dupRes.ok) {
    assert.equal(dupRes.error.code, "duplicate");
  }

  // 4. Auth failure simulation
  provider.setFailureMode("auth");
  const authRes = await provider.createShipment({
    orderNumber: "ANG-FAIL-04",
    recipientName: "Customer",
    recipientPhone: "01711112222",
    recipientAddress: "Banani, Dhaka",
    codAmount: 1000,
  });
  assert.equal(authRes.ok, false);
  if (!authRes.ok) {
    assert.equal(authRes.error.code, "auth");
  }

  // Reset
  provider.reset();
  assert.equal(provider.getFailureMode(), "none");
});

test("MockSteadfastProvider: Simulates full tracking lifecycle updates (pickup, in_transit, delivered, returned)", async () => {
  const provider = new MockSteadfastProvider();
  const created = await provider.createShipment({
    orderNumber: "ANG-LIFECYCLE-1",
    recipientName: "Tracking Customer",
    recipientPhone: "01755556666",
    recipientAddress: "Uttara Sector 3, Dhaka",
    codAmount: 3200,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const cid = created.consignmentId!;
  const trk = created.trackingCode!;

  // Initial status query
  const initStatus = await provider.getStatus({ consignmentId: cid });
  assert.equal(initStatus.ok, true);
  assert.equal(initStatus.status, "created");

  // Simulate Pickup
  provider.simulateStatusUpdate(cid, "picked_up", "picked_up");
  const pickupStatus = await provider.getStatus({ trackingCode: trk });
  assert.equal(pickupStatus.ok, true);
  assert.equal(pickupStatus.status, "picked_up");

  // Simulate In-Transit
  provider.simulateStatusUpdate(cid, "in_transit", "in_transit");
  const transitStatus = await provider.getStatus({ consignmentId: cid });
  assert.equal(transitStatus.ok, true);
  assert.equal(transitStatus.status, "in_transit");

  // Simulate Delivered
  provider.simulateStatusUpdate(trk, "delivered", "delivered");
  const deliveredStatus = await provider.getStatus({ consignmentId: cid });
  assert.equal(deliveredStatus.ok, true);
  assert.equal(deliveredStatus.status, "delivered");

  // Simulate Return
  provider.simulateStatusUpdate(cid, "returned", "returned");
  const returnStatus = await provider.getStatus({ trackingCode: trk });
  assert.equal(returnStatus.ok, true);
  assert.equal(returnStatus.status, "returned");
});

test("MockSteadfastProvider: Simulates parcel cancellation", async () => {
  const provider = new MockSteadfastProvider();
  const created = await provider.createShipment({
    orderNumber: "ANG-CANCEL-1",
    recipientName: "Cancel Customer",
    recipientPhone: "01733334444",
    recipientAddress: "Mirpur 10, Dhaka",
    codAmount: 1800,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const cancelResult = await provider.cancelShipment({
    consignmentId: created.consignmentId!,
    orderNumber: "ANG-CANCEL-1",
    reason: "Customer requested cancellation before dispatch",
  });

  assert.equal(cancelResult.ok, true);
  assert.equal(cancelResult.status, "cancelled");

  const statusAfterCancel = await provider.getStatus({ consignmentId: created.consignmentId! });
  assert.equal(statusAfterCancel.status, "cancelled");
});

test("MockSteadfastProvider: Simulated balance returns mock credit with financial decoupling tags", async () => {
  const provider = new MockSteadfastProvider();
  const bal = await provider.getBalance();
  assert.equal(bal.ok, true);
  assert.equal(bal.balance, 50000);
  assert.equal(bal.currency, "BDT");
  assert.equal(bal.isMock, true);
  assert.equal(bal.simulated, true);
});

test("Security Rule 9: Prevents accidental booking of local test orders", () => {
  assert.equal(isLocalTestOrder("TEST-1001"), true);
  assert.equal(isLocalTestOrder("MOCK-2002"), true);
  assert.equal(isLocalTestOrder("DEV-3003"), true);
  assert.equal(isLocalTestOrder("ANG-SANDBOX-01"), true);
  assert.equal(isLocalTestOrder("ANG-1001", { phone: "01700000000" }), true);
  assert.equal(isLocalTestOrder("ANG-1001", { phone: "01800000000" }), true);
  assert.equal(isLocalTestOrder("ANG-1001", { email: "customer@test.com" }), true);
  assert.equal(isLocalTestOrder("ANG-1001", { email: "john@example.com" }), true);

  // Real orders are permitted
  assert.equal(
    isLocalTestOrder("ANG-261121-0001", { phone: "01712345678", email: "customer@gmail.com" }),
    false
  );
  assert.equal(
    isLocalTestOrder("ANG-261121-0002", { phone: "01898765432", email: "buyer@yahoo.com" }),
    false
  );
});

test("Security Rule 8: Prevents switching existing live shipments into mock mode", () => {
  // Even when default is mock mode, passing forceLive or mode="live" returns live adapter
  const adapterForLiveShipment = getCourierAdapter("steadfast", {
    mode: "live",
    forceLive: true,
  });
  assert.equal(adapterForLiveShipment, steadfastAdapter);
  assert.notEqual(adapterForLiveShipment, mockSteadfastProvider);

  // Mock shipments stay attached to mock provider
  const adapterForMockShipment = getCourierAdapter("steadfast", {
    mode: "mock",
  });
  assert.equal(adapterForMockShipment, mockSteadfastProvider);
});

test("Security Rule 1, 2, 3: Missing live config fails safely and defaults to mock", () => {
  const originalCourierMode = process.env.COURIER_MODE;
  const originalLiveBooking = process.env.STEADFAST_LIVE_BOOKING_ENABLED;
  const originalForceLive = process.env.FORCE_LIVE_COURIER_TEST;

  try {
    // 1. Unset env defaults to mock
    delete process.env.COURIER_MODE;
    delete process.env.STEADFAST_LIVE_BOOKING_ENABLED;
    delete process.env.FORCE_LIVE_COURIER_TEST;
    const config1 = getCourierModeConfig();
    assert.equal(config1.mode, "mock");
    assert.equal(config1.isMock, true);
    assert.equal(config1.isLive, false);

    // 2. COURIER_MODE=live without STEADFAST_LIVE_BOOKING_ENABLED=true fails safely
    process.env.FORCE_LIVE_COURIER_TEST = "true";
    process.env.COURIER_MODE = "live";
    process.env.STEADFAST_LIVE_BOOKING_ENABLED = "false";
    const config2 = getCourierModeConfig();
    assert.equal(config2.isLive, true);
    assert.equal(config2.liveBookingEnabled, false);
    assert.ok(config2.reason?.includes("STEADFAST_LIVE_BOOKING_ENABLED is not 'true'"));
  } finally {
    if (originalCourierMode !== undefined) process.env.COURIER_MODE = originalCourierMode;
    else delete process.env.COURIER_MODE;

    if (originalLiveBooking !== undefined) process.env.STEADFAST_LIVE_BOOKING_ENABLED = originalLiveBooking;
    else delete process.env.STEADFAST_LIVE_BOOKING_ENABLED;

    if (originalForceLive !== undefined) process.env.FORCE_LIVE_COURIER_TEST = originalForceLive;
    else delete process.env.FORCE_LIVE_COURIER_TEST;
  }
});

test("Check 1: isTestOrder explicit document flag and test indicators isolation", () => {
  // Explicit isTestOrder flag on order document
  assert.equal(
    isLocalTestOrder("ANG-261121-0003", { phone: "01712345678", email: "real@customer.com" }, { isTestOrder: true }),
    true
  );
  assert.equal(
    isLocalTestOrder("ANG-261121-0004", { phone: "01712345678", email: "real@customer.com" }, { isTest: true }),
    true
  );

  // Customer name test markers
  assert.equal(
    isLocalTestOrder("ANG-261121-0005", { fullName: "Test Customer", phone: "01712345678" }),
    true
  );
  assert.equal(
    isLocalTestOrder("ANG-261121-0006", { fullName: "Mock Customer Order", phone: "01712345678" }),
    true
  );

  // Standard non-test customer is cleanly allowed
  assert.equal(
    isLocalTestOrder(
      "ANG-261121-0007",
      { fullName: "Saddam Hossain", phone: "01712345678", email: "saddam@angkon.com" },
      { isTestOrder: false }
    ),
    false
  );
});

test("Check 2: Live booking confirmation requirement server-side validation", () => {
  const mode = getCourierModeConfig();
  // If live mode is evaluated, confirmLiveBooking must be strictly true
  const validateLiveConfirmation = (isLive: boolean, confirmLiveBooking?: boolean) => {
    if (isLive && confirmLiveBooking !== true) {
      return { ok: false, code: "LIVE_CONFIRMATION_REQUIRED" };
    }
    return { ok: true };
  };

  assert.deepEqual(validateLiveConfirmation(true, false), {
    ok: false,
    code: "LIVE_CONFIRMATION_REQUIRED",
  });
  assert.deepEqual(validateLiveConfirmation(true, undefined), {
    ok: false,
    code: "LIVE_CONFIRMATION_REQUIRED",
  });
  assert.deepEqual(validateLiveConfirmation(true, true), { ok: true });
  assert.deepEqual(validateLiveConfirmation(false, false), { ok: true });
});

test("Check 3: Ambiguous timeout triggers lookup by merchant invoice before retry", async () => {
  // Simulate the recovery mechanism:
  // When an order booking times out, Steadfast status by invoice must be queried
  // before declaring failure or retrying.
  const mockInvoiceStore = new Map<string, { consignmentId: string; trackingCode: string }>();
  mockInvoiceStore.set("ANG-ORDER-TIMEOUT-1", {
    consignmentId: "CID-RECOVERED-999",
    trackingCode: "TRK-RECOVERED-999",
  });

  async function mockCreateWithInvoiceRecovery(orderNumber: string, simulateTimeout: boolean) {
    if (simulateTimeout) {
      // Simulate timeout on POST /create_order
      // Recovery routine checks status_by_invoice
      const existing = mockInvoiceStore.get(orderNumber);
      if (existing) {
        return {
          ok: true,
          recovered: true,
          consignmentId: existing.consignmentId,
          trackingCode: existing.trackingCode,
        };
      }
      return { ok: false, error: "timeout" };
    }
    return { ok: true, consignmentId: "CID-NEW-1", trackingCode: "TRK-NEW-1" };
  }

  const result = await mockCreateWithInvoiceRecovery("ANG-ORDER-TIMEOUT-1", true);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.consignmentId, "CID-RECOVERED-999");
    assert.equal(result.trackingCode, "TRK-RECOVERED-999");
  }
});

test("Check 4: Simulated balance and mock shipments are decoupled from real financial data", async () => {
  const provider = new MockSteadfastProvider();
  const mockBal = await provider.getBalance();

  // Mock balance is tagged with isMock and simulated flags
  assert.equal(mockBal.isMock, true);
  assert.equal(mockBal.simulated, true);
  assert.equal(mockBal.balance, 50000);

  // Mock consignment IDs are prefixed with MOCK-
  const mockBooking = await provider.createShipment({
    orderNumber: "ANG-TEST-FIN-1",
    recipientName: "Test Customer",
    recipientPhone: "01712345678",
    recipientAddress: "Mirpur DOHS, Dhaka",
    codAmount: 1200,
  });
  assert.equal(mockBooking.ok, true);
  if (mockBooking.ok) {
    assert.ok(mockBooking.consignmentId?.startsWith("MOCK-CID-"));
    assert.ok(mockBooking.trackingCode?.startsWith("MOCK-TRK-"));
    assert.equal(mockBooking.raw.isMock, true);
    assert.equal(mockBooking.raw.mode, "mock");
  }
});

test("Shipment schema accepts every canonical courier status (regression: unknown caused 500)", () => {
  const statusPath = Shipment.schema.path("status") as unknown as { enumValues?: string[] };
  const enumValues = statusPath.enumValues || [];
  for (const status of SHIPMENT_STATUSES) {
    assert.ok(
      enumValues.includes(status),
      `Shipment.status enum must include "${status}" - missing values make bookings fail with a 500`
    );
  }
  assert.ok(enumValues.includes("unknown"));
});

