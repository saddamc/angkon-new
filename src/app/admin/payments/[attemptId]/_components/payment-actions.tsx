"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, MessageSquarePlus, Undo2 } from "lucide-react";

interface PaymentActionsProps {
  attemptId: string;
  status: string;
  expectedAmount: number;
  currency?: string;
  provider?: string;
  orderNumber?: string;
}

const REFUNDABLE = new Set(["succeeded", "paid", "partially_refunded"]);

export function PaymentActions({
  attemptId,
  status,
  expectedAmount,
  currency = "BDT",
  provider = "sslcommerz",
  orderNumber,
}: PaymentActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [note, setNote] = useState("");
  const [flagForReview, setFlagForReview] = useState(false);

  const [refundAmount, setRefundAmount] = useState(String(expectedAmount));
  const [refundReason, setRefundReason] = useState("");

  const isGateway = provider === "sslcommerz";

  const run = async (
    key: string,
    url: string,
    body?: Record<string, unknown>,
    successText?: string
  ) => {
    try {
      setBusy(key);
      setMessage(null);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setMessage({ type: "error", text: data.error || "Request failed." });
        return;
      }
      setMessage({ type: "ok", text: successText || "Done." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Admin Actions
        </h2>
        {isGateway && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={busy === "reconcile"}
            onClick={() => run("reconcile", `/api/payments/${attemptId}/reconcile`, undefined, "Reconciliation completed.")}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {busy === "reconcile" ? "Reconciling..." : "Reconcile now"}
          </Button>
        )}
      </div>

      {message && (
        <p
          className={`text-xs ${
            message.type === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Internal review note (append-only)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="What did you verify? Include gateway references."
          className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
        />
        <label className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={flagForReview}
            onChange={(e) => setFlagForReview(e.target.checked)}
          />
          Flag this attempt for manual review
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={busy === "note" || !note.trim()}
          onClick={() =>
            run(
              "note",
              `/api/payments/${attemptId}/note`,
              { note, flagForReview },
              "Review note recorded."
            ).then(() => {
              setNote("");
              setFlagForReview(false);
            })
          }
        >
          {busy === "note" ? "Saving..." : "Save review note"}
        </Button>
      </div>

      {REFUNDABLE.has(status) && isGateway && (
        <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
            <Undo2 className="w-3.5 h-3.5" />
            Issue refund via SSLCOMMERZ
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={expectedAmount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full sm:w-32 px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
              placeholder={`Amount (${currency})`}
            />
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
              placeholder="Reason (required for the audit trail)"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={busy === "refund" || !refundReason.trim()}
              onClick={() =>
                run(
                  "refund",
                  `/api/payments/${attemptId}/refund`,
                  { amount: Number(refundAmount), reason: refundReason },
                  "Refund request submitted. Status will update after gateway confirmation."
                ).then(() => setRefundReason(""))
              }
            >
              {busy === "refund" ? "Submitting..." : "Request refund"}
            </Button>
          </div>
          <p className="text-[11px] text-neutral-400">
            A refund is a separate financial operation. The payment stays successful until
            the gateway confirms the refund.
          </p>
        </div>
      )}

      {REFUNDABLE.has(status) && !isGateway && (
        <div className="space-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Manual payment — refund offline
          </p>
          <p className="text-[11px] leading-relaxed text-neutral-500">
            This amount was recorded by an administrator, so it cannot be refunded through
            SSLCOMMERZ. Record the refund from the order so the paid balance and COD update.
          </p>
          {orderNumber && (
            <Link
              href={`/admin/orders/${orderNumber}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Open order #{orderNumber}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
