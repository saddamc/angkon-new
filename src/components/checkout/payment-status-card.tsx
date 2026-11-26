"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const [retryError, setRetryError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  const token = attempt.statusToken || statusToken || "";

  // Detect bfcache restores (browser Back/Forward) and force a full reload so
  // the server always renders a fresh attempt status instead of a stale cache.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const fetchLatestStatus = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/payments/${attempt.id}/status${query}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.attempt) {
          const updatedStatus = normalizeStatus(String(data.attempt.status));
          // When the payment is confirmed via IPN/reconciliation while customer
          // watches the processing spinner, redirect them to the proper
          // thank-you page instead of silently switching the card state.
          if (
            updatedStatus === "succeeded" &&
            !redirectedRef.current &&
            data.attempt.orderNumber
          ) {
            redirectedRef.current = true;
            window.location.replace(
              `/thankyou-for-shopping?order=${encodeURIComponent(data.attempt.orderNumber)}&payment=success`
            );
            return;
          }
          setAttempt({
            ...data.attempt,
            status: updatedStatus,
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
      setRetryError(null);
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/payments/${attempt.id}/retry${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.ok && data.data?.gatewayUrl) {
        window.location.assign(data.data.gatewayUrl);
      } else {
        setRetryError(data.error || "Unable to restart payment. Please return to checkout.");
        setIsRetrying(false);
      }
    } catch {
      setRetryError("Network error restarting payment. Please check your connection.");
      setIsRetrying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#3b050b] shadow-2xl overflow-hidden">
      <div className="border-b border-[#E1B76F]/20 bg-[#2e0409] px-6 py-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-[#E1B76F]/90 font-semibold">
        <span>ANGKON · Payment Status</span>
        <span className="text-white/60 font-mono">SSLCOMMERZ</span>
      </div>

      <div className="p-6 md:p-8">
        {retryError && (
          <div className="mb-5 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-xs text-rose-200 text-center">
            {retryError}
          </div>
        )}

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
            amount={attempt.expectedAmount}
            tranId={attempt.tranId}
            reason={attempt.failureReason}
            onRetry={attempt.canRetry !== false ? handleRetry : undefined}
            isRetrying={isRetrying}
          />
        )}

        {isCancelled && (
          <PaymentCancelled
            orderNumber={attempt.orderNumber}
            amount={attempt.expectedAmount}
            tranId={attempt.tranId}
            onRetry={attempt.canRetry !== false ? handleRetry : undefined}
            isRetrying={isRetrying}
          />
        )}

        {(status === "expired" || status === "unknown" || status === "review_required") && !isCancelled && (
          <PaymentPending
            orderNumber={attempt.orderNumber}
            amount={attempt.expectedAmount}
            tranId={attempt.tranId}
            onRefreshStatus={fetchLatestStatus}
            isRefreshing={isRefreshing}
          />
        )}

        {(status === "created" || status === "initiating" || status === "pending") && !isCancelled && (
          <PaymentProcessing
            orderNumber={attempt.orderNumber}
            amount={attempt.expectedAmount}
            tranId={attempt.tranId}
            onRefreshStatus={fetchLatestStatus}
            isRefreshing={isRefreshing}
          />
        )}
      </div>
    </div>
  );
}
