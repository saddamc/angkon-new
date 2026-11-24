"use client";

import React from "react";
import { Check, AlertCircle, Loader2, X } from "lucide-react";

export interface AdminToastProps {
  message: string;
  ok?: boolean;
  onClose?: () => void;
}

/**
 * Centered top-middle toast notification for admin actions.
 */
export function AdminToast({ message, ok = true, onClose }: AdminToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-2rem)] max-w-md pointer-events-none"
    >
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 shadow-2xl border backdrop-blur-md text-[13px] font-bold text-white transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
          ok
            ? "bg-emerald-600/95 border-emerald-500 shadow-emerald-900/20"
            : "bg-rose-600/95 border-rose-500 shadow-rose-900/20"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
            {ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          </div>
          <span className="leading-snug break-words">{message}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            className="shrink-0 p-1 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export interface AdminProcessingOverlayProps {
  label: string;
  detail?: string;
  blocking?: boolean;
}

/**
 * Centered loading indicator shown while DB/Cloudinary mutations are running.
 */
export function AdminProcessingOverlay({
  label,
  detail,
  blocking = false,
}: AdminProcessingOverlayProps) {
  if (blocking) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[490] flex items-center justify-center bg-black/35 backdrop-blur-[2px] p-4"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white border border-purple-100 shadow-2xl px-6 py-5 flex items-center gap-4">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-black text-gray-900 leading-tight">{label}</p>
            {detail && (
              <p className="text-[12px] text-gray-500 mt-1 leading-snug">{detail}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[490] w-[calc(100%-2rem)] max-w-md pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3.5 bg-slate-900/95 border border-slate-700 text-white shadow-2xl backdrop-blur-md">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-purple-300" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-tight">{label}</p>
          {detail && <p className="text-[11px] text-slate-300 mt-0.5">{detail}</p>}
        </div>
      </div>
    </div>
  );
}
