import mongoose from "mongoose";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { CourierLog } from "@/models/CourierLog";
import { Order, type IOrder } from "@/models/Order";
import { Shipment, type IShipment } from "@/models/Shipment";
import {
  checkCourierBookingEligibility,
  computeOrderFinancials,
  normalizeOrderStatus,
} from "@/server/orders/workflow";
import { commitStockForOrder, releaseStockForOrder } from "@/server/products/stock";
import { steadfastAdapter } from "../providers/steadfast";
import { mockSteadfastProvider } from "../mock/steadfast";
import { getCourierModeConfig, isLocalTestOrder, type CourierMode } from "./courier-mode";
import { pathaoAdapter } from "../providers/pathao";
import { redxAdapter } from "../providers/redx";
import { buildRecipientAddress, normalizeBdPhone, SHIPMENT_STATUSES } from "../providers/steadfast/utils";
import { serializeShipment } from "./serialize";
import { getCourierSettings } from "../settings";
import {
  COURIER_PROVIDER_LIST,
  getCourierLabel,
  type ApiCourierProvider,
  type CourierSettings,
} from "./tracking";
import type {
  CourierAdapter,
  CourierErrorCode,
  CourierProviderMeta,
} from "./types";

export const COURIER_FAILURE_HTTP_STATUS: Record<CourierErrorCode, number> = {
  "not-configured": 503,
  auth: 502,
  validation: 422,
  duplicate: 409,
  "rate-limited": 429,
  timeout: 504,
  upstream: 502,
};

function sanitizeLogMessage(msg: string): string {
  return String(msg || "Unknown courier response")
    .replace(/(api[-_]?key|secret[-_]?key|secret|token|bearer)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, 320);
}

async function findOrderDoc(id: string): Promise<IOrder | null> {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ orderNumber: id }, { _id: id }] }
    : { orderNumber: id };
  return Order.findOne(query);
}

export class CourierService {
  getAdapter(
    provider: ApiCourierProvider | "steadfast" | "pathao" | "redx" = "steadfast",
    options?: { mode?: CourierMode; forceLive?: boolean }
  ): CourierAdapter {
    if (provider === "pathao") return pathaoAdapter;
    if (provider === "redx") return redxAdapter;

    if (options?.forceLive || options?.mode === "live") {
      return steadfastAdapter;
    }
    if (options?.mode === "mock") {
      return mockSteadfastProvider;
    }

    const modeConfig = getCourierModeConfig();
    if (modeConfig.mode === "live" && modeConfig.liveBookingEnabled && modeConfig.hasCredentials) {
      return steadfastAdapter;
    }
    return mockSteadfastProvider;
  }

  getProviderStatuses(settings?: CourierSettings) {
    const modeConfig = getCourierModeConfig();
    return COURIER_PROVIDER_LIST.map((desc) => {
      const adapter = this.getAdapter(desc.id);
      const enabledInSettings = settings
        ? desc.id === "steadfast"
          ? settings.enabledProviders.steadfast
          : false
        : desc.supported;

      return {
        id: desc.id,
        label:
          desc.id === "steadfast" && modeConfig.mode === "mock"
            ? `${desc.label} (Mock/Dev)`
            : desc.label,
        shortLabel: desc.shortLabel,
        supported: desc.supported,
        enabled: desc.supported && enabledInSettings,
        configured: desc.supported ? adapter.isConfigured() : false,
        disabledReason: desc.disabledReason || null,
        mode: desc.id === "steadfast" ? modeConfig.mode : "live",
        isMock: desc.id === "steadfast" ? modeConfig.isMock : false,
        liveBookingEnabled: desc.id === "steadfast" ? modeConfig.liveBookingEnabled : false,
      };
    });
  }

  async logEvent(entry: {
    provider: string;
    action: string;
    orderId?: mongoose.Types.ObjectId | null;
    orderNumber?: string;
    consignmentId?: string;
    ok: boolean;
    httpStatus?: number | null;
    durationMs?: number | null;
    message: string;
    errorCode?: string | null;
    actor?: string;
  }) {
    try {
      await CourierLog.create({
        provider: entry.provider,
        action: entry.action,
        orderId: entry.orderId ?? null,
        orderNumber: entry.orderNumber ?? "",
        consignmentId: entry.consignmentId ?? "",
        ok: entry.ok,
        httpStatus: entry.httpStatus ?? null,
        durationMs: entry.durationMs ?? null,
        message: sanitizeLogMessage(entry.message),
        errorCode: entry.errorCode ?? null,
        actor: entry.actor || "system",
      });
    } catch (err) {
      console.warn("[CourierService] Failed to write CourierLog:", err);
    }
  }

  async bookShipment(args: {
    orderIdOrNumber: string;
    provider?: string;
    note?: string;
    recipient?: Record<string, unknown>;
    allowCodFallback?: boolean;
    providerMeta?: CourierProviderMeta;
    confirmLiveBooking?: boolean;
    actor: string;
    tenantId: string;
    ip: string;
    userAgent: string;
  }): Promise<
    | {
        ok: true;
        existing?: boolean;
        shipment: ReturnType<typeof serializeShipment>;
        customer: IOrder["customer"];
        orderStatus: string;
        codAmount: number;
      }
    | { ok: false; status: number; code: string; error: string }
  > {
    const startedAt = Date.now();
    const settings = await getCourierSettings();
    const modeConfig = getCourierModeConfig();

    const requestedProvider = (args.provider || settings.defaultProvider || "steadfast")
      .trim()
      .toLowerCase();

    if (requestedProvider === "redx") {
      return {
        ok: false,
        status: 400,
        code: "PROVIDER_NOT_CONFIGURED",
        error:
          "RedX Courier integration is pending official API documentation and credentials. Setup is required.",
      };
    }

    if (requestedProvider === "pathao") {
      return {
        ok: false,
        status: 400,
        code: "PROVIDER_NOT_CONFIGURED",
        error:
          "Pathao Courier integration is disabled until a future release. Please use Steadfast.",
      };
    }

    if (requestedProvider !== "steadfast") {
      return {
        ok: false,
        status: 400,
        code: "PROVIDER_UNSUPPORTED",
        error: `Courier provider "${requestedProvider}" is not supported for live booking.`,
      };
    }

    const provider: ApiCourierProvider = "steadfast";
    if (!settings.enabledProviders.steadfast) {
      return {
        ok: false,
        status: 409,
        code: "PROVIDER_DISABLED",
        error: "Steadfast Courier is currently disabled in Settings → Courier Configuration.",
      };
    }

    // Safety Gate: Mode 2 (Live) checks
    if (modeConfig.mode === "live") {
      if (!modeConfig.liveBookingEnabled || !modeConfig.hasCredentials) {
        return {
          ok: false,
          status: 503,
          code: "LIVE_BOOKING_DISABLED",
          error:
            modeConfig.reason ||
            "Live Steadfast booking is disabled or credentials are missing on the server.",
        };
      }
      if (args.confirmLiveBooking !== true) {
        return {
          ok: false,
          status: 400,
          code: "LIVE_CONFIRMATION_REQUIRED",
          error:
            "Live Courier Mode is ACTIVE! Creating this consignment will register a real parcel with Steadfast and schedule physical courier pickup. Explicit administrator confirmation is required.",
        };
      }
    }

    const adapter = this.getAdapter(provider, { mode: modeConfig.mode });
    if (!adapter.isConfigured()) {
      return {
        ok: false,
        status: 503,
        code: "not-configured",
        error: `${getCourierLabel(provider)} credentials are not configured on the server.`,
      };
    }

    const order = await findOrderDoc(args.orderIdOrNumber);
    if (!order) {
      return { ok: false, status: 404, code: "NOT_FOUND", error: "Order not found" };
    }

    // Security Rule 9: Prevent accidental booking of local test orders in live mode
    if (
      modeConfig.mode === "live" &&
      (order.isTestOrder || isLocalTestOrder(order.orderNumber, order.customer, order))
    ) {
      return {
        ok: false,
        status: 400,
        code: "TEST_ORDER_LIVE_BOOKING_BLOCKED",
        error:
          "Accidental live booking prevented: This order is identified as a local test/mock order. Live courier consignments can only be created for verified customer orders.",
      };
    }

    // Existing active consignment check (Rule 7).
    const existingActive = await Shipment.findOne({
      orderId: order._id,
      status: { $nin: ["cancelled", "returned", "failed"] },
    }).sort({ createdAt: -1 });

    // If caller re-submitted for an already-booked consignment of same provider, treat idempotently.
    if (
      existingActive &&
      existingActive.provider === provider &&
      existingActive.consignmentId
    ) {
      return {
        ok: true,
        existing: true,
        shipment: serializeShipment(existingActive),
        customer: order.customer,
        orderStatus: String(order.orderStatus),
        codAmount: existingActive.codAmount,
      };
    }

    const eligibility = checkCourierBookingEligibility({
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paidAmount: order.paidAmount,
      total: order.total,
      shipmentStatus: order.shipmentStatus,
      shipmentBookingState: order.shipmentBookingState,
      consignmentId: order.consignmentId,
      hasActiveShipmentRow: Boolean(existingActive),
    });

    if (!eligibility.ok) {
      return {
        ok: false,
        status: eligibility.status,
        code: eligibility.code,
        error: eligibility.reason,
      };
    }

    // Check unpaid SSLCOMMERZ protection
    const isUnpaidOnline =
      String(order.paymentMethod) !== "cod" &&
      String(order.paymentStatus) !== "paid" &&
      String(order.paymentStatus) !== "partially_paid";

    if (
      isUnpaidOnline &&
      !settings.allowUnpaidOnlineShipment &&
      args.allowCodFallback !== true
    ) {
      return {
        ok: false,
        status: 409,
        code: "UNPAID_ONLINE_ORDER",
        error:
          "This online payment order is still unpaid. Confirm COD fallback or wait for gateway verification before booking.",
      };
    }

    // Inline audited recipient update if provided.
    if (args.recipient && typeof args.recipient === "object") {
      const rec = args.recipient;
      const nextName =
        typeof rec.fullName === "string" && rec.fullName.trim()
          ? rec.fullName.trim().slice(0, 100)
          : order.customer.fullName;
      const nextRawPhone =
        typeof rec.phone === "string" && rec.phone.trim() ? rec.phone.trim() : order.customer.phone;
      const nextNormPhone = normalizeBdPhone(nextRawPhone);
      if (!nextNormPhone) {
        return {
          ok: false,
          status: 422,
          code: "validation",
          error: "Recipient phone must be a valid 11-digit Bangladeshi mobile number.",
        };
      }
      const nextAddress =
        typeof rec.address === "string" && rec.address.trim()
          ? rec.address.trim().slice(0, 220)
          : order.customer.address;
      const nextCity =
        typeof rec.city === "string" ? rec.city.trim().slice(0, 80) : order.customer.city;
      const nextDistrict =
        typeof rec.district === "string"
          ? rec.district.trim().slice(0, 80)
          : order.customer.district;

      const changed =
        nextName !== order.customer.fullName ||
        nextNormPhone !== normalizeBdPhone(order.customer.phone) ||
        nextAddress !== order.customer.address ||
        nextCity !== order.customer.city ||
        nextDistrict !== order.customer.district;

      if (changed) {
        const prevCustomer = { ...order.customer };
        order.customer.fullName = nextName;
        order.customer.phone = nextNormPhone;
        order.customer.address = nextAddress;
        order.customer.city = nextCity;
        order.customer.district = nextDistrict;
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              "customer.fullName": nextName,
              "customer.phone": nextNormPhone,
              "customer.address": nextAddress,
              "customer.city": nextCity,
              "customer.district": nextDistrict,
            },
          }
        );
        try {
          await AdminAuditLog.create({
            tenantId: args.tenantId,
            actor: args.actor,
            action: "order.recipient.update",
            targetType: "order",
            targetId: order.orderNumber,
            before: prevCustomer,
            after: {
              fullName: nextName,
              phone: nextNormPhone,
              address: nextAddress,
              city: nextCity,
              district: nextDistrict,
            },
            ip: args.ip,
            userAgent: args.userAgent,
          });
        } catch (auditErr) {
          console.warn("Admin audit log write failed:", auditErr);
        }
      }
    }

    const phone = normalizeBdPhone(order.customer.phone);
    if (!phone) {
      return {
        ok: false,
        status: 422,
        code: "validation",
        error: "Recipient phone must be a valid 11-digit Bangladeshi mobile number.",
      };
    }

    const address = buildRecipientAddress([
      order.customer.address,
      order.customer.city,
      order.customer.district,
      order.customer.postalCode,
    ]);
    if (address.length < 10) {
      return {
        ok: false,
        status: 422,
        code: "validation",
        error: "Recipient address is too short for a courier booking.",
      };
    }

    // Courier-specific weight & manual estimate validation
    const targetCourier = (args.provider || order.courier || "steadfast").toLowerCase();

    if (targetCourier === "pathao") {
      // Pathao: strictly requires verified package weight in kilograms (> 0)
      const weightNum = Number(args.providerMeta?.packageWeight);
      if (
        args.providerMeta?.packageWeight === undefined ||
        args.providerMeta?.packageWeight === null ||
        isNaN(weightNum) ||
        weightNum <= 0
      ) {
        return {
          ok: false,
          status: 400,
          code: "WEIGHT_REQUIRED",
          error: "Pathao requires a valid package weight greater than 0 kg. Please verify product weights or enter an estimated weight.",
        };
      }

      if (
        args.providerMeta?.weightEstimated &&
        !args.providerMeta.manualEstimateReason?.trim()
      ) {
        return {
          ok: false,
          status: 400,
          code: "ESTIMATE_REASON_REQUIRED",
          error: "A reason is mandatory when manually estimating shipment weight for Pathao.",
        };
      }
    } else if (targetCourier === "steadfast") {
      // Steadfast: product weight is strictly optional.
      // Do not block booking because product weight is missing, zero, or unverified.
      // Do not require manual estimation reasons.
      // If a valid non-negative weight is provided, it is recorded in Shipment document for internal reporting/analytics.
      if (args.providerMeta?.packageWeight !== undefined && args.providerMeta?.packageWeight !== null) {
        const weightNum = Number(args.providerMeta.packageWeight);
        if (!isNaN(weightNum) && weightNum < 0) {
          return {
            ok: false,
            status: 400,
            code: "INVALID_WEIGHT",
            error: "Package weight cannot be negative.",
          };
        }
      }
    } else {
      // RedX and future providers: follow verified official API requirements without unsupported assumptions.
      if (args.providerMeta?.packageWeight !== undefined && args.providerMeta?.packageWeight !== null) {
        const weightNum = Number(args.providerMeta.packageWeight);
        if (!isNaN(weightNum) && weightNum < 0) {
          return {
            ok: false,
            status: 400,
            code: "INVALID_WEIGHT",
            error: "Package weight cannot be negative.",
          };
        }
      }
    }

    // Rules 4, 5, 6: Compute collectible COD strictly from backend financials.
    const financials = computeOrderFinancials(order);
    const codAmount = financials.codAmountToCollect;

    if (codAmount > 0 && !settings.codEnabled) {
      return {
        ok: false,
        status: 409,
        code: "COD_DISABLED",
        error: "COD shipments are currently disabled in Courier Configuration.",
      };
    }

    // One active consignment per order. Reopening a cancelled order must never
    // silently produce a second live parcel at the courier.
    const existingActiveShipment = await Shipment.findOne({
      orderId: order._id,
      status: {
        $nin: ["cancelled", "failed", "returned", "delivered", "partial_delivered"],
      },
    })
      .select("status consignmentId trackingCode")
      .lean();
    if (existingActiveShipment) {
      return {
        ok: false,
        status: 409,
        code: "ACTIVE_SHIPMENT_EXISTS",
        error: `Consignment ${
          existingActiveShipment.consignmentId || existingActiveShipment.trackingCode || ""
        } is already active for this order. Cancel it before booking a new one.`,
      };
    }

    // Rule 7 & 8: Atomically claim booking_in_progress on Order before external call.
    // A stale in-progress lock older than 45s (e.g. from an aborted lambda) is safe to reclaim.
    const staleLockCutoff = new Date(Date.now() - 45_000);
    const claimedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        $or: [
          { shipmentBookingState: { $nin: ["booking_in_progress", "booked", "cancellation_pending"] } },
          { shipmentBookingState: "booking_in_progress", updatedAt: { $lt: staleLockCutoff } },
        ],
      },
      { $set: { shipmentBookingState: "booking_in_progress" } },
      { new: true }
    );

    if (!claimedOrder) {
      return {
        ok: false,
        status: 409,
        code: "BOOKING_CONFLICT",
        error: "Another courier booking operation is already active for this order.",
      };
    }

    const note = (
      typeof args.note === "string" && args.note.trim()
        ? args.note.trim()
        : settings.defaultParcelNote || ""
    ).slice(0, 200);

    // Booking epoch: failed retries reuse the same key, while a cancelled
    // consignment increments the epoch so the new parcel gets its own record.
    const priorCancelledBookings = await Shipment.countDocuments({
      orderId: order._id,
      provider,
      status: "cancelled",
    });
    const idempotencyKey = `${order.orderNumber}:${provider}:${priorCancelledBookings + 1}`;
    let shipment: IShipment;

    try {
      shipment = await Shipment.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        provider,
        mode: modeConfig.mode,
        isMock: modeConfig.isMock,
        confirmedByAdmin: modeConfig.isLive && Boolean(args.confirmLiveBooking),
        confirmedByAdminId: args.actor || "admin",
        confirmedAt: new Date(),
        status: "pending",
        codAmount,
        packageWeight:
          args.providerMeta?.packageWeight != null
            ? Number(args.providerMeta.packageWeight)
            : null,
        parcelCategory: args.providerMeta?.parcelType || null,
        packagingType: args.providerMeta?.packagingType || null,
        recipientName: order.customer.fullName,
        recipientPhone: phone,
        recipientAddress: address,
        note,
        providerMeta:
          args.providerMeta && Object.keys(args.providerMeta).length
            ? (args.providerMeta as Record<string, unknown>)
            : null,
        idempotencyKey,
        events: [
          {
            status: "pending",
            at: new Date(),
            note:
              modeConfig.mode === "live"
                ? "Live Steadfast consignment requested."
                : "Mock development consignment requested.",
          },
        ],
      });
    } catch (createError) {
      const mongoError = createError as { code?: number };
      if (mongoError?.code === 11000) {
        const retried = await Shipment.findOneAndUpdate(
          { idempotencyKey, status: { $in: ["failed", "cancelled"] } },
          {
            $set: {
              status: "pending",
              mode: modeConfig.mode,
              isMock: modeConfig.isMock,
              confirmedByAdmin: modeConfig.isLive && Boolean(args.confirmLiveBooking),
              confirmedByAdminId: args.actor || "admin",
              confirmedAt: new Date(),
              codAmount,
              recipientName: order.customer.fullName,
              recipientPhone: phone,
              recipientAddress: address,
              note,
              error: null,
            },
            $push: {
              events: { status: "pending", at: new Date(), note: "Consignment retried." },
            },
          },
          { new: true }
        );
        if (retried) {
          shipment = retried;
        } else {
          await Order.updateOne(
            { _id: order._id, shipmentBookingState: "booking_in_progress" },
            { $set: { shipmentBookingState: "not_booked" } }
          );
          const raced = await Shipment.findOne({ idempotencyKey });
          if (raced && raced.consignmentId) {
            return {
              ok: true,
              existing: true,
              shipment: serializeShipment(raced),
              customer: order.customer,
              orderStatus: String(order.orderStatus),
              codAmount: raced.codAmount,
            };
          }
          return {
            ok: false,
            status: 409,
            code: "DUPLICATE_SHIPMENT",
            error: "A consignment record already exists for this order.",
          };
        }
      } else {
        await Order.updateOne(
          { _id: order._id, shipmentBookingState: "booking_in_progress" },
          { $set: { shipmentBookingState: "booking_failed" } }
        );
        throw createError;
      }
    }

    const result = await adapter.createShipment({
      orderNumber: order.orderNumber,
      recipientName: order.customer.fullName,
      recipientPhone: phone,
      recipientAddress: address,
      codAmount,
      note,
      itemDescription: args.providerMeta?.itemDescription,
      totalLot: args.providerMeta?.totalLot,
      parcelType: args.providerMeta?.parcelType,
      packageWeight: args.providerMeta?.packageWeight,
      weightEstimated: args.providerMeta?.weightEstimated,
      providerMeta: args.providerMeta,
    });

    const durationMs = Date.now() - startedAt;

    if (!result.ok) {
      // Rule 9: Courier API failures MUST NOT change payment status.
      shipment.status = "failed";
      shipment.error = result.error.message;
      shipment.events.push({
        status: "failed",
        at: new Date(),
        note: `${result.error.code}: ${result.error.message}`.slice(0, 200),
      });
      await shipment.save();

      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            shipmentBookingState: "booking_failed",
            shipmentStatus: "booking_failed",
            courierBookingError: result.error.message,
          },
        }
      );

      const httpStatus = COURIER_FAILURE_HTTP_STATUS[result.error.code] ?? 502;
      await this.logEvent({
        provider,
        action: "book",
        orderId: order._id,
        orderNumber: order.orderNumber,
        ok: false,
        httpStatus,
        durationMs,
        message: result.error.message,
        errorCode: result.error.code,
        actor: args.actor,
      });

      return {
        ok: false,
        status: httpStatus,
        code: result.error.code,
        error: result.error.message,
      };
    }

    // Defensive: a provider adapter must never be able to write a status the
    // schema rejects (historically "unknown" did exactly that and produced 500s).
    const persistedStatus = (SHIPMENT_STATUSES as readonly string[]).includes(result.status)
      ? result.status
      : "unknown";

    try {
      shipment.status = persistedStatus;
      shipment.consignmentId = result.consignmentId;
      shipment.trackingCode = result.trackingCode;
      shipment.providerShipmentId = result.consignmentId || result.trackingCode;
      shipment.deliveryCharge = result.deliveryCharge;
      shipment.rawResponse = result.raw;
      shipment.lastSyncedAt = new Date();
      shipment.error = null;
      const isMockBooking = Boolean(shipment.isMock || shipment.mode === "mock");
      shipment.events.push({
        status: persistedStatus,
        at: new Date(),
        note: isMockBooking
          ? `[SIMULATED / TEST] Mock development consignment created for ${getCourierLabel(provider)}.`
          : `Consignment accepted by ${getCourierLabel(provider)}.`,
      });
      await shipment.save();
    } catch (persistError) {
      // The provider may have created a real consignment, so do not pretend the
      // booking succeeded — but always release the order lock for a safe retry.
      console.error("Courier booking persistence error:", persistError);
      await Shipment.updateOne(
        { _id: shipment._id },
        {
          $set: {
            status: "failed",
            error: "The courier response could not be saved. Check the courier portal before retrying.",
          },
        }
      ).catch(() => {});
      await Order.updateOne(
        { _id: order._id, shipmentBookingState: "booking_in_progress" },
        {
          $set: {
            shipmentBookingState: "booking_failed",
            shipmentStatus: "booking_failed",
            courierBookingError:
              "The courier response could not be saved. Check the courier portal before retrying.",
          },
        }
      ).catch(() => {});
      return {
        ok: false,
        status: 502,
        code: "upstream",
        error:
          "The courier response could not be saved. Check the courier portal before retrying.",
      };
    }

    const now = new Date();
    const prevOrderStatus = normalizeOrderStatus(order.orderStatus);
    // Booking a shipment transitions order to ready_to_ship (packed & awaiting courier pickup).
    // An order is only marked "shipped" when the courier physically picks up the parcel (webhook / sync).
    const nextOrderStatus =
      ["confirmed", "processing"].includes(prevOrderStatus)
        ? "ready_to_ship"
        : String(order.orderStatus);

    const orderPatch: Record<string, unknown> = {
      shipmentStatus: result.status,
      shipmentBookingState: "booked",
      providerStatus: (result as unknown as { rawStatus?: string }).rawStatus || String(result.status),
      courierMode: provider === "steadfast" ? "steadfast" : "manual",
      courierOperatingMode: modeConfig.mode,
      courierIsMock: modeConfig.isMock,
      courierConfirmedByAdminId: args.actor || "admin",
      courierConfirmedAt: now,
      courier: provider,
      courierName: getCourierLabel(provider),
      courierBookingError: null,
      consignmentId: result.consignmentId || "",
      trackingCode: result.trackingCode || "",
      trackingUrl: result.trackingCode
        ? `https://steadfast.com.bd/t/${encodeURIComponent(result.trackingCode)}`
        : null,
      orderStatus: nextOrderStatus,
      expectedCodAmount: codAmount,
      codSettlementStatus:
        codAmount > 0
          ? order.codSettlementStatus === "settled" || order.codSettlementStatus === "collected"
            ? order.codSettlementStatus
            : "expected"
          : "none",
    };

    if (result.deliveryCharge !== null && result.deliveryCharge > 0) {
      orderPatch.courierCharge = result.deliveryCharge;
    }

    if (isUnpaidOnline && args.allowCodFallback) {
      orderPatch.paymentMethod = "cod";
      try {
        await AdminAuditLog.create({
          tenantId: args.tenantId,
          actor: args.actor,
          action: "order.delivery.unpaid_online_cod_override",
          targetType: "order",
          targetId: order.orderNumber,
          before: { paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus },
          after: { paymentMethod: "cod", courier: provider, codAmount },
          ip: args.ip,
          userAgent: args.userAgent,
        });
      } catch (auditErr) {
        console.warn("Admin audit log write failed:", auditErr);
      }
    }

    const updateOps: Record<string, unknown> = { $set: orderPatch };
    if (nextOrderStatus !== prevOrderStatus) {
      updateOps.$push = {
        statusHistory: {
          status: nextOrderStatus,
          previousStatus: prevOrderStatus,
          actor: args.actor,
          note: `Booked ${getCourierLabel(provider)} consignment ${result.consignmentId || ""}`.trim(),
          source: "courier_booking",
          at: now,
        },
      };
    }

    await Order.updateOne({ _id: order._id }, updateOps);
    await commitStockForOrder(order);

    await this.logEvent({
      provider,
      action: "book",
      orderId: order._id,
      orderNumber: order.orderNumber,
      consignmentId: result.consignmentId || "",
      ok: true,
      httpStatus: 200,
      durationMs,
      message: `Consignment ${result.consignmentId || result.trackingCode || "created"} booked (COD ৳${codAmount}).`,
      actor: args.actor,
    });

    try {
      await AdminAuditLog.create({
        tenantId: args.tenantId,
        actor: args.actor,
        action: modeConfig.isLive ? "order.shipment.booked_live" : "order.shipment.booked",
        targetType: "order",
        targetId: order.orderNumber,
        before: {
          orderStatus: prevOrderStatus,
          shipmentBookingState: order.shipmentBookingState || "not_booked",
        },
        after: {
          orderStatus: nextOrderStatus,
          shipmentBookingState: "booked",
          provider,
          mode: modeConfig.mode,
          isMock: modeConfig.isMock,
          confirmedByAdmin: modeConfig.isLive && Boolean(args.confirmLiveBooking),
          confirmedByAdminId: args.actor || "admin",
          confirmedAt: now,
          consignmentId: result.consignmentId || "",
          trackingCode: result.trackingCode || "",
          codAmount,
        },
        ip: args.ip,
        userAgent: args.userAgent,
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return {
      ok: true,
      shipment: serializeShipment(shipment),
      customer: order.customer,
      orderStatus: nextOrderStatus,
      codAmount,
    };
  }

  async cancelShipment(args: {
    orderIdOrNumber: string;
    /** Cancel a specific shipment record (e.g. when duplicate active consignments exist). */
    shipmentId?: string;
    reason?: string;
    actor: string;
    tenantId: string;
    ip: string;
    userAgent: string;
    /** Set only after the admin has cancelled the parcel in the courier portal. */
    confirmExternalCancellation?: boolean;
  }): Promise<
    | { ok: true; shipment: ReturnType<typeof serializeShipment>; shipmentBookingState: string }
    | { ok: false; status: number; code: string; error: string }
  > {
    const order = await findOrderDoc(args.orderIdOrNumber);
    if (!order) {
      return { ok: false, status: 404, code: "NOT_FOUND", error: "Order not found" };
    }

    const shipmentFilter: Record<string, unknown> = {
      orderId: order._id,
      status: { $nin: ["cancelled", "delivered", "partial_delivered", "returned"] },
    };
    if (
      args.shipmentId &&
      mongoose.Types.ObjectId.isValid(args.shipmentId)
    ) {
      shipmentFilter._id = new mongoose.Types.ObjectId(args.shipmentId);
    }
    const shipment = await Shipment.findOne(shipmentFilter).sort({ createdAt: -1 });

    if (!shipment) {
      return {
        ok: false,
        status: 404,
        code: "NO_ACTIVE_SHIPMENT",
        error: "No cancellable active courier consignment exists for this order.",
      };
    }

    const reason = (args.reason || "Cancelled by admin").trim().slice(0, 200);
    await Order.updateOne(
      { _id: order._id },
      { $set: { shipmentBookingState: "cancellation_pending" } }
    );

    const isLive = shipment.mode === "live" || shipment.isMock === false;
    const adapter = this.getAdapter(
      shipment.provider === "pathao" ? "pathao" : "steadfast",
      { forceLive: isLive }
    );
    if (adapter.cancelShipment) {
      const cancelRes = await adapter.cancelShipment({
        consignmentId: shipment.consignmentId,
        orderNumber: order.orderNumber,
        reason,
      });
      if (!cancelRes.ok) {
        await Order.updateOne(
          { _id: order._id },
          { $set: { shipmentBookingState: "booked" } }
        );
        await this.logEvent({
          provider: shipment.provider,
          action: "cancel",
          orderId: order._id,
          orderNumber: order.orderNumber,
          consignmentId: shipment.consignmentId || "",
          ok: false,
          message: cancelRes.error?.message || cancelRes.message,
          errorCode: cancelRes.error?.code || "upstream",
          actor: args.actor,
        });
        return {
          ok: false,
          status: 502,
          code: cancelRes.error?.code || "CANCEL_FAILED",
          error: cancelRes.error?.message || cancelRes.message,
        };
      }
    } else if (isLive && !args.confirmExternalCancellation) {
      // This provider (e.g. Steadfast) has no public cancellation API. Marking
      // the consignment cancelled locally while the parcel still exists at the
      // courier creates a dangerous mismatch, so require portal cancellation
      // plus an explicit admin confirmation instead.
      const portalMessage =
        `${getCourierLabel(shipment.provider)} has no API cancellation. ` +
        `Cancel consignment ${shipment.consignmentId || shipment.trackingCode || ""} in the ` +
        `${getCourierLabel(shipment.provider)} portal, then confirm "Mark cancelled" here.`;
      await Order.updateOne(
        { _id: order._id },
        { $set: { shipmentBookingState: "booked" } }
      );
      await this.logEvent({
        provider: shipment.provider,
        action: "cancel",
        orderId: order._id,
        orderNumber: order.orderNumber,
        consignmentId: shipment.consignmentId || "",
        ok: false,
        message: portalMessage,
        errorCode: "COURIER_CANCEL_REQUIRES_PORTAL",
        actor: args.actor,
      });
      return {
        ok: false,
        status: 409,
        code: "COURIER_CANCEL_REQUIRES_PORTAL",
        error: portalMessage,
      };
    }

    const now = new Date();
    const prevShipmentStatus = shipment.status;
    shipment.status = "cancelled";
    shipment.lastSyncedAt = now;
    shipment.events.push({
      status: "cancelled",
      at: now,
      note: reason,
    });
    await shipment.save();

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          shipmentStatus: "cancelled",
          shipmentBookingState: "cancelled",
          ...(order.paymentStatus !== "paid" ? { codSettlementStatus: "none" } : {}),
        },
      }
    );

    if (["cancelled", "returned"].includes(String(order.orderStatus))) {
      await releaseStockForOrder(order);
    }

    await this.logEvent({
      provider: shipment.provider,
      action: "cancel",
      orderId: order._id,
      orderNumber: order.orderNumber,
      consignmentId: shipment.consignmentId || "",
      ok: true,
      httpStatus: 200,
      message: `Shipment cancelled locally (${reason}). Confirm parcel recall in Steadfast merchant portal if already scanned.`,
      actor: args.actor,
    });

    try {
      await AdminAuditLog.create({
        tenantId: args.tenantId,
        actor: args.actor,
        action: "order.shipment.cancelled",
        targetType: "order",
        targetId: order.orderNumber,
        before: {
          shipmentStatus: prevShipmentStatus,
          consignmentId: shipment.consignmentId || "",
        },
        after: {
          shipmentStatus: "cancelled",
          shipmentBookingState: "cancelled",
          reason,
        },
        ip: args.ip,
        userAgent: args.userAgent,
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return {
      ok: true,
      shipment: serializeShipment(shipment),
      shipmentBookingState: "cancelled",
    };
  }

  async testConnection(args: { provider?: string; actor: string; forceLive?: boolean }) {
    const startedAt = Date.now();
    const provider = (args.provider || "steadfast").trim().toLowerCase();
    const settings = await getCourierSettings();
    const modeConfig = getCourierModeConfig();

    if (provider === "pathao") {
      return {
        ok: false,
        provider: "pathao",
        configured: false,
        enabled: false,
        latencyMs: 0,
        message: "Pathao integration is not enabled yet.",
        testedAt: new Date().toISOString(),
      };
    }

    if (provider === "redx") {
      return {
        ok: false,
        provider: "redx",
        configured: false,
        enabled: false,
        latencyMs: 0,
        message:
          "RedX Courier connection test is disabled pending official API documentation and credentials. Setup required.",
        testedAt: new Date().toISOString(),
      };
    }

    const isLive = args.forceLive || modeConfig.mode === "live";
    const adapter = this.getAdapter("steadfast", { forceLive: isLive });
    if (!adapter.isConfigured()) {
      await this.logEvent({
        provider: "steadfast",
        action: "test_connection",
        ok: false,
        httpStatus: 503,
        durationMs: Date.now() - startedAt,
        message: "Steadfast API credentials are not configured.",
        errorCode: "not-configured",
        actor: args.actor,
      });
      return {
        ok: false,
        provider: "steadfast",
        configured: false,
        enabled: settings.enabledProviders.steadfast,
        latencyMs: Date.now() - startedAt,
        message: "Steadfast API key/secret environment variables are missing.",
        testedAt: new Date().toISOString(),
      };
    }

    const bal = await adapter.getBalance();
    const latencyMs = Date.now() - startedAt;
    const modeLabel = isLive ? "Live Steadfast API" : "Mock Steadfast Provider (Development)";
    const message = bal.ok
      ? `Connected to ${modeLabel} (${latencyMs}ms). Current merchant balance: ${bal.balance ?? 0} ${bal.currency || "BDT"}.`
      : bal.error?.message || "Steadfast API connection failed.";

    await this.logEvent({
      provider: "steadfast",
      action: isLive ? "test_connection_live" : "test_connection_mock",
      ok: bal.ok,
      httpStatus: bal.ok ? 200 : COURIER_FAILURE_HTTP_STATUS[bal.error?.code || "upstream"] ?? 502,
      durationMs: latencyMs,
      message,
      errorCode: bal.ok ? null : bal.error?.code || "upstream",
      actor: args.actor,
    });

    return {
      ok: bal.ok,
      provider: "steadfast",
      mode: isLive ? "live" : "mock",
      isMock: !isLive,
      configured: true,
      enabled: settings.enabledProviders.steadfast,
      balance: bal.ok ? bal.balance ?? null : null,
      currency: bal.currency || "BDT",
      latencyMs,
      message,
      testedAt: new Date().toISOString(),
    };
  }

  async getDiagnostics() {
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [latestSyncLog, latestShipmentSync, errorLogs, total24h, error24h] =
        await Promise.all([
          CourierLog.findOne({ action: { $in: ["status_sync", "bulk_sync", "webhook", "test_connection"] }, ok: true })
            .sort({ createdAt: -1 })
            .lean()
            .catch(() => null),
          Shipment.findOne({ lastSyncedAt: { $ne: null } })
            .sort({ lastSyncedAt: -1 })
            .select("lastSyncedAt")
            .lean()
            .catch(() => null),
          CourierLog.find({ ok: false })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
            .catch(() => []),
          CourierLog.countDocuments({ createdAt: { $gte: since24h } }).catch(() => 0),
          CourierLog.countDocuments({ ok: false, createdAt: { $gte: since24h } }).catch(() => 0),
        ]);

      const lastSyncDate =
        (latestShipmentSync?.lastSyncedAt ? new Date(latestShipmentSync.lastSyncedAt) : null) ||
        (latestSyncLog?.createdAt ? new Date(latestSyncLog.createdAt) : null);

      return {
        lastSyncAt: lastSyncDate ? lastSyncDate.toISOString() : null,
        health: error24h === 0 ? "healthy" : error24h < 5 ? "degraded" : "unhealthy",
        stats24h: {
          totalCalls: total24h,
          errorCount: error24h,
          successCount: Math.max(0, total24h - error24h),
        },
        recentErrors: (errorLogs || []).map((l) => ({
          id: String(l._id),
          provider: l.provider,
          action: l.action,
          orderNumber: l.orderNumber || "",
          httpStatus: l.httpStatus ?? null,
          durationMs: l.durationMs ?? null,
          message: l.message,
          errorCode: l.errorCode ?? null,
          createdAt: l.createdAt ? l.createdAt.toISOString() : null,
        })),
      };
    } catch (err) {
      console.warn("[CourierService] getDiagnostics fallback due to error:", err);
      return {
        lastSyncAt: null,
        health: "healthy",
        stats24h: { totalCalls: 0, errorCount: 0, successCount: 0 },
        recentErrors: [],
      };
    }
  }
}

export const courierService = new CourierService();
