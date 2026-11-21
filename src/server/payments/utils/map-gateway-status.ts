import type { PaymentAttemptStatus } from "../types";

/**
 * Maps raw gateway status strings from SSLCOMMERZ into internal canonical statuses.
 */
export function mapGatewayStatus(rawStatus?: string | null): {
  normalized: "VALID" | "FAILED" | "CANCELLED" | "PENDING" | "EXPIRED" | "UNATTEMPTED" | "UNKNOWN";
  internalStatus: PaymentAttemptStatus;
} {
  const status = String(rawStatus || "").trim().toUpperCase();

  switch (status) {
    case "VALID":
    case "VALIDATED":
      return { normalized: "VALID", internalStatus: "succeeded" };

    case "FAILED":
    case "FAIL":
      return { normalized: "FAILED", internalStatus: "failed" };

    case "CANCELLED":
    case "CANCEL":
      return { normalized: "CANCELLED", internalStatus: "cancelled" };

    case "EXPIRED":
      return { normalized: "EXPIRED", internalStatus: "expired" };

    case "UNATTEMPTED":
      return { normalized: "UNATTEMPTED", internalStatus: "failed" };

    case "PENDING":
      return { normalized: "PENDING", internalStatus: "pending" };

    default:
      return { normalized: "UNKNOWN", internalStatus: "unknown" };
  }
}
