"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PaymentSuccess } from "./payment-success";
import { PaymentFailed } from "./payment-failed";
import { PaymentCancelled } from "./payment-cancelled";
import { PaymentPending } from "./payment-pending";
import { PaymentProcessing } from "./payment-processing";
import type { PaymentAttemptStatus } from "@/server/payments/types";

interface PaymentAttemptData {
  id: string;
  orderNumber: string;
  tranId: string;
  status: PaymentAttemptStatus | string;
  customerActivity: string;
  expectedAmount: number;
  currency: string;
  paidAt?: Date | string | null;
  failedAt?: Date | string | null;
  failureReason?: string | null;
  valId?: string | null;
  isTerminal: boolean;
  canRetry?: boolean;
  statusToken?: string;
}

interface PaymentStatusCardProps {
  initialAttempt: PaymentAttemptData;
  statusToken?: string;
}

const LEGACY_STATUS: Record<string, PaymentAttemptStatus> = {
  paid: "succeeded",
  initiated: "pending",
};

function normalizeStatus(status: string): PaymentAttemptStatus {
  return (LEGACY_STATUS[status] || status) as PaymentAttemptStatus;
}

export function PaymentStatusCard({ initialAttempt, statusToken }: PaymentStatusCardProps) {
  const [attempt, setAttempt] = useState<PaymentAttemptData>({
    ...initialAttempt,
    status: normalizeStatus(String(initialAttempt.status)),
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const token = attempt.statusToken || statusToken || "";

  const fetchLatestStatus = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/payments/${attempt.id}/status${query}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.attempt) {
          setAttempt({
            ...data.attempt,
            status: normalizeStatus(String(data.attempt.status)),
            statusToken: data.attempt.statusToken || token,
          });
        }
      }
    } catch {
      // transient network poll failure
    } finally {
      setIsRefreshing(false);
    }
  }, [attempt.id, token]);

  const status = normalizeStatus(String(attempt.status));
  const isCancelled =
    status === "cancelled" ||
    (attempt.customerActivity === "returned_cancelled" &&
      status !== "succeeded" &&
      status !== "refunded" &&
      status !== "partially_refunded");

  // Automatic polling while in non-terminal state
  useEffect(() => {
    if (attempt.isTerminal || isCancelled) return;

    const interval = setInterval(() => {
      fetchLatestStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [attempt.isTerminal, isCancelled, fetchLatestStatus]);

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/payments/${attempt.id}/retry${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.ok && data.data?.gatewayUrl) {
        window.location.assign(data.data.gatewayUrl);
      } else {
        alert(data.error || "Unable to restart payment. Please try again.");
        setIsRetrying(false);
      }
    } catch {
      alert("Network error restarting payment. Please check your connection.");
      setIsRetrying(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 md:p-8">
      {(status === "succeeded" || status === "refunded" || status === "partially_refunded") && (
        <PaymentSuccess
          orderNumber={attempt.orderNumber}
          amount={attempt.expectedAmount}
          tranId={attempt.tranId}
          valId={attempt.valId}
          paidAt={attempt.paidAt}
        />
      )}

      {status === "failed" && (
        <PaymentFailed
          orderNumber={attempt.orderNumber}
          reason={attempt.failureReason}
          onRetry={attempt.canRetry !== false ? handleRetry : undefined}
          isRetrying={isRetrying}
        />
      )}

      {isCancelled && (
        <PaymentCancelled
          orderNumber={attempt.orderNumber}
          onRetry={attempt.canRetry !== false ? handleRetry : undefined}
          isRetrying={isRetrying}
        />
      )}

      {(status === "expired" || status === "unknown" || status === "review_required") && !isCancelled && (
        <PaymentPending
          orderNumber={attempt.orderNumber}
          amount={attempt.expectedAmount}
          onRefreshStatus={fetchLatestStatus}
          isRefreshing={isRefreshing}
        />
      )}

      {(status === "created" || status === "initiating" || status === "pending") && !isCancelled && (
        <PaymentProcessing
          orderNumber={attempt.orderNumber}
          amount={attempt.expectedAmount}
        />
      )}
    </div>
  );
}
