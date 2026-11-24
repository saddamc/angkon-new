/**
 * Pure Steadfast helpers — no imports, so they can be unit-tested directly.
 */

/**
 * Every canonical courier/shipment status. Kept as a runtime const so model
 * enums and UI labels can never drift from the type.
 */
export const SHIPMENT_STATUSES = [
  "not_booked",
  "booking_pending",
  "booking_failed",
  "booked",
  "pickup_pending",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "partial_delivered",
  "delivery_failed",
  "return_initiated",
  "returned",
  "cancelled",
  "unknown",
  "created",
  "pending",
  "hold",
  "in_review",
  "failed",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/**
 * Every status a live consignment can still advance FROM. The bulk admin sync
 * and the cron courier-sync both scan exactly this list, so it must include
 * `booked` / `pickup_pending` / `picked_up` — a freshly booked live parcel sits
 * at `booked` (Steadfast "created") and would otherwise never be polled until
 * a webhook or manual refresh moved it. Terminal/booking-local statuses
 * (`delivered`, `returned`, `cancelled`, `failed`, `not_booked`,
 * `booking_pending`, `booking_failed`) are excluded on purpose.
 */
export const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  "created",
  "pending",
  "booked",
  "pickup_pending",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "partial_delivered",
  "delivery_failed",
  "return_initiated",
  "hold",
  "in_review",
  "unknown",
];

export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

/** Normalises a Bangladeshi mobile number to `01XXXXXXXXX`, or returns null. */
export function normalizeBdPhone(input: unknown): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("880")) local = local.slice(2);
  if (local.length === 10 && local.startsWith("1")) local = `0${local}`;
  if (!BD_PHONE_REGEX.test(local)) return null;
  return local;
}

/** Joins address parts into the single line Steadfast expects. */
export function buildRecipientAddress(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .slice(0, 250);
}

export function mapSteadfastStatus(raw: unknown): ShipmentStatus {
  const status = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (status) {
    case "delivered":
    case "delivered_approval_pending":
      return "delivered";
    case "partial_delivered":
    case "partial_delivered_approval_pending":
      return "partial_delivered";
    case "cancelled":
    case "canceled":
    case "cancel":
    case "cancelled_approval_pending":
      return "cancelled";
    case "hold":
    case "on_hold":
      return "delivery_failed";
    case "delivery_failed":
      return "delivery_failed";
    case "in_review":
      return "in_review";
    // Steadfast's status API returns literal "in_review" for ACTIVE
    // consignments and "unknown" for consignments REMOVED in the merchant
    // portal (verified live). Coercing unknown→in_review hid portal
    // cancellations, so unknown must stay indeterminate — the admin UI
    // surfaces it as "Check Courier" with a portal-cancellation action.
    case "picked_up":
    case "picked":
    case "pickup":
    case "pickedup":
      return "picked_up";
    case "in_transit":
    case "transit":
      return "in_transit";
    case "out_for_delivery":
      return "out_for_delivery";
    case "return_initiated":
      return "return_initiated";
    case "returned":
    case "return":
      return "returned";
    case "created":
      return "booked";
    case "pending":
      return "pickup_pending";
    case "booking_failed":
    case "failed":
      return "booking_failed";
    case "not_booked":
    case "none":
      return "not_booked";
    default:
      return status ? "unknown" : "not_booked";
  }
}

/** True when the courier physically picks up the parcel or puts it in transit. */
export function isShippedStatus(status: ShipmentStatus): boolean {
  return ["picked_up", "in_transit", "out_for_delivery"].includes(status);
}

/** True when the courier reports the parcel as delivered to the customer. */
export function isDeliveredStatus(status: ShipmentStatus): boolean {
  return status === "delivered" || status === "partial_delivered";
}

/** True when the shipment is no longer active. */
export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return [
    "delivered",
    "partial_delivered",
    "cancelled",
    "returned",
    "failed",
    "booking_failed",
  ].includes(status);
}

/**
 * Normalizes synonym states for clean transition comparison.
 */
function normalizeShipmentState(s: ShipmentStatus): string {
  if (s === "created") return "booked";
  if (s === "pending") return "pickup_pending";
  if (s === "hold") return "delivery_failed";
  if (s === "failed") return "booking_failed";
  return s;
}

/**
 * Pure transition evaluation engine for courier shipments.
 *
 * Enforces:
 * - Forward delivery lifecycle progression.
 * - Post-delivery protections: delivered states CANNOT regress to transit states.
 * - Support for legitimate return events after delivery (delivered -> return_initiated / returned).
 * - Terminal immutability: returned and cancelled states cannot be overwritten.
 * - Separation of return lifecycle from forward transit progression.
 */
export interface TransitionEvaluation {
  allowed: boolean;
  reason: string;
  isReturnLifecycle?: boolean;
  idempotent?: boolean;
}

export interface TransitionOptions {
  isCourierVerifiedSync?: boolean;
}

export function evaluateShipmentTransition(
  currentStatus: ShipmentStatus,
  targetStatus: ShipmentStatus,
  options?: TransitionOptions
): TransitionEvaluation {
  const normCurrent = normalizeShipmentState(currentStatus);
  const normTarget = normalizeShipmentState(targetStatus);

  if (normCurrent === normTarget) {
    return { allowed: true, idempotent: true, reason: "idempotent_same_status" };
  }

  // 1. Terminal returned state: cannot transition to any other status
  if (normCurrent === "returned") {
    return {
      allowed: false,
      reason: `Cannot transition from terminal returned state to "${targetStatus}".`,
    };
  }

  // 2. Cancellation handling:
  // If target is cancelled: Allowed from any pre-delivery status
  if (normTarget === "cancelled") {
    if (normCurrent === "delivered" || normCurrent === "partial_delivered" || normCurrent === "returned") {
      return {
        allowed: false,
        reason: `Cannot cancel a shipment that is already ${normCurrent}.`,
      };
    }
    return {
      allowed: true,
      reason: "courier_cancelled",
    };
  }

  // If current is cancelled: cannot transition UNLESS verified by courier sync reconciliation
  if (normCurrent === "cancelled") {
    if (
      options?.isCourierVerifiedSync &&
      [
        "in_review",
        "booked",
        "pickup_pending",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "partial_delivered",
      ].includes(normTarget)
    ) {
      return {
        allowed: true,
        reason: "courier_sync_reconciliation_from_cancelled",
      };
    }
    return {
      allowed: false,
      reason: `Cannot transition from terminal cancelled state to "${targetStatus}".`,
    };
  }

  // 3. Post-delivery protections: delivered / partial_delivered can ONLY
  // transition to a return lifecycle.
  if (normCurrent === "delivered" || normCurrent === "partial_delivered") {
    if (normTarget === "returned" || normTarget === "return_initiated") {
      return {
        allowed: true,
        reason: "legitimate_post_delivery_return",
        isReturnLifecycle: true,
      };
    }
    return {
      allowed: false,
      reason: `Invalid status regression: delivered shipment cannot transition backwards to "${targetStatus}".`,
    };
  }

  // 4. Return lifecycle initiated during forward transit or delivery failure
  if (normTarget === "returned" || normTarget === "return_initiated") {
    return {
      allowed: true,
      reason: "return_during_transit",
      isReturnLifecycle: true,
    };
  }

  // 5. Forward delivery regressions protection:
  // Once in out_for_delivery, cannot regress to booked, pickup_pending, picked_up, in_transit
  if (
    normCurrent === "out_for_delivery" &&
    ["booked", "pickup_pending", "picked_up", "in_transit"].includes(normTarget)
  ) {
    return {
      allowed: false,
      reason: `Invalid status regression: "${currentStatus}" cannot regress backwards to "${targetStatus}".`,
    };
  }

  if (
    normCurrent === "in_transit" &&
    ["booked", "pickup_pending", "picked_up"].includes(normTarget)
  ) {
    return {
      allowed: false,
      reason: `Invalid status regression: "${currentStatus}" cannot regress backwards to "${targetStatus}".`,
    };
  }

  if (
    normCurrent === "picked_up" &&
    ["booked", "pickup_pending"].includes(normTarget)
  ) {
    return {
      allowed: false,
      reason: `Invalid status regression: "${currentStatus}" cannot regress backwards to "${targetStatus}".`,
    };
  }

  return { allowed: true, reason: "valid_forward_transition" };
}

/**
 * Extracts a human-readable validation or upstream error from Steadfast JSON
 * payloads, including HTTP 200 responses that carry `{ status: 400, errors: { ... } }`.
 */
export function extractSteadfastPayloadError(payload: unknown): {
  statusCode: number | null;
  message: string;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const raw = payload as Record<string, unknown>;
  const numericStatus = typeof raw.status === "number" ? raw.status : Number(raw.status);
  const statusCode = Number.isFinite(numericStatus) ? numericStatus : null;

  const errorParts: string[] = [];
  if (typeof raw.message === "string" && raw.message.trim() && (statusCode === null || statusCode >= 400)) {
    errorParts.push(raw.message.trim());
  }
  if (typeof raw.error === "string" && raw.error.trim()) {
    errorParts.push(raw.error.trim());
  }
  if (typeof raw.errors === "string" && raw.errors.trim()) {
    errorParts.push(raw.errors.trim());
  } else if (raw.errors && typeof raw.errors === "object" && !Array.isArray(raw.errors)) {
    for (const [field, val] of Object.entries(raw.errors as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        const joined = val.map((v) => String(v ?? "").trim()).filter(Boolean).join(", ");
        if (joined) errorParts.push(`${field}: ${joined}`);
      } else if (typeof val === "string" && val.trim()) {
        errorParts.push(`${field}: ${val.trim()}`);
      }
    }
  } else if (Array.isArray(raw.errors)) {
    for (const item of raw.errors) {
      if (typeof item === "string" && item.trim()) errorParts.push(item.trim());
    }
  }

  if (statusCode !== null && statusCode >= 400) {
    return {
      statusCode,
      message: errorParts.join(" · ") || `Steadfast rejected the request (status ${statusCode}).`,
    };
  }
  if (errorParts.length > 0 && !raw.consignment && !raw.consignment_id && !raw.tracking_code) {
    return {
      statusCode,
      message: errorParts.join(" · "),
    };
  }
  return null;
}
