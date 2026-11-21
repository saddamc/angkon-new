import type { PaymentAttemptStatus } from "@/server/payments/types";

export interface PaymentStatusInfo {
  label: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  title: string;
  description: string;
  canRetry: boolean;
  isTerminal: boolean;
}

export const PAYMENT_STATUS_DETAILS: Record<PaymentAttemptStatus, PaymentStatusInfo> = {
  created: {
    label: "Initiated",
    badgeVariant: "secondary",
    title: "Payment Initiated",
    description: "Preparing your payment session...",
    canRetry: false,
    isTerminal: false,
  },
  initiating: {
    label: "Connecting",
    badgeVariant: "secondary",
    title: "Connecting to Gateway",
    description: "Redirecting you to the secure payment portal...",
    canRetry: false,
    isTerminal: false,
  },
  pending: {
    label: "Awaiting Confirmation",
    badgeVariant: "warning",
    title: "Payment Processing",
    description: "We are verifying your transaction with SSLCOMMERZ. Please do not close this window.",
    canRetry: false,
    isTerminal: false,
  },
  succeeded: {
    label: "Paid Successfully",
    badgeVariant: "success",
    title: "Payment Successful!",
    description: "Your payment has been verified and your order is confirmed.",
    canRetry: false,
    isTerminal: true,
  },
  failed: {
    label: "Payment Failed",
    badgeVariant: "destructive",
    title: "Payment Was Not Completed",
    description: "The payment could not be processed by your bank or the payment gateway.",
    canRetry: true,
    isTerminal: true,
  },
  cancelled: {
    label: "Cancelled",
    badgeVariant: "outline",
    title: "Payment Cancelled",
    description: "You cancelled the payment transaction.",
    canRetry: true,
    isTerminal: true,
  },
  expired: {
    label: "Session Expired",
    badgeVariant: "secondary",
    title: "Payment Session Expired",
    description: "The payment window timed out before completion.",
    canRetry: true,
    isTerminal: true,
  },
  unknown: {
    label: "Verification Pending",
    badgeVariant: "warning",
    title: "Verifying Transaction",
    description: "We could not immediately reach the gateway. Our automatic reconciler is checking your transaction.",
    canRetry: true,
    isTerminal: false,
  },
  review_required: {
    label: "Under Review",
    badgeVariant: "warning",
    title: "Payment Under Review",
    description: "Your payment was received but has been flagged for manual verification by our security team.",
    canRetry: false,
    isTerminal: false,
  },
  refunded: {
    label: "Refunded",
    badgeVariant: "secondary",
    title: "Payment Refunded",
    description: "This payment has been refunded to your original payment method.",
    canRetry: false,
    isTerminal: true,
  },
  partially_refunded: {
    label: "Partially Refunded",
    badgeVariant: "secondary",
    title: "Partially Refunded",
    description: "A partial refund has been issued for this payment.",
    canRetry: false,
    isTerminal: true,
  },
};

const LEGACY_STATUS_ALIASES: Record<string, PaymentAttemptStatus> = {
  paid: "succeeded",
  initiated: "pending",
};

export function getPaymentStatusInfo(status: PaymentAttemptStatus | string): PaymentStatusInfo {
  const normalized = (LEGACY_STATUS_ALIASES[status] || status) as PaymentAttemptStatus;
  return (
    PAYMENT_STATUS_DETAILS[normalized] || {
      label: String(status).toUpperCase(),
      badgeVariant: "secondary",
      title: "Payment Status",
      description: "Transaction details are updating...",
      canRetry: false,
      isTerminal: false,
    }
  );
}
