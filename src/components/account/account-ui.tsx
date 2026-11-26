"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import type { AccountNotice } from "@/types/account";

export const accountInputClass =
  "w-full rounded-xl border border-[#E1B76F]/30 bg-[#240407] px-4 py-3 text-sm sm:text-[15px] text-white placeholder-white/45 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/60 focus:outline-none transition shadow-inner";

export const accountPrimaryBtnClass =
  "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E1B76F] via-[#edd19b] to-[#E1B76F] py-3.5 px-5 text-xs font-black uppercase tracking-wider text-[#2a0408] hover:brightness-105 active:scale-[0.99] transition shadow-lg disabled:opacity-50 cursor-pointer";

export const accountSecondaryBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E1B76F]/40 bg-[#490810] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#F7E5C8] hover:border-[#E1B76F] hover:bg-[#5b0b15] transition disabled:opacity-50 cursor-pointer";

export function formatBDT(amount: number | undefined | null): string {
  return `৳${Number(amount || 0).toLocaleString("en-BD")}`;
}

export function formatAccountDate(iso: string | undefined | null, withTime = false): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Dhaka",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return String(iso);
  }
}

export function formatEnumLabel(raw?: string | null, map?: Record<string, string>, fallback = "Pending"): string {
  const key = String(raw || "").trim().toLowerCase();
  if (!key) return fallback;
  if (map?.[key]) return map[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function postJson(url: string, body?: unknown, method: "POST" | "PATCH" | "DELETE" = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function AccountNoticeBanner({
  notice,
  onDismiss,
}: {
  notice: AccountNotice;
  onDismiss?: () => void;
}) {
  if (!notice) return null;

  const config = {
    success: {
      cls: "border-emerald-400/45 bg-emerald-950/75 text-emerald-50",
      Icon: CheckCircle2,
      iconCls: "text-emerald-300",
    },
    error: {
      cls: "border-rose-400/50 bg-[#4a0710] text-rose-50",
      Icon: AlertTriangle,
      iconCls: "text-rose-300",
    },
    info: {
      cls: "border-[#E1B76F]/45 bg-[#3b050b] text-[#F9EFE2]",
      Icon: Info,
      iconCls: "text-[#E1B76F]",
    },
  }[notice.type];

  const Icon = config.Icon;

  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-lg backdrop-blur-sm ${config.cls}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconCls}`} />
        <p className="leading-relaxed">{notice.text}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-bold uppercase tracking-wider text-white/75 hover:text-white cursor-pointer shrink-0"
          aria-label="Dismiss notice"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export function AccountFieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F3E7D8] mb-1.5">
      {children} {required && <span className="text-rose-300">*</span>}
    </label>
  );
}

export function AccountPasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${accountInputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3.5 top-3.5 text-white/65 hover:text-[#E1B76F] transition cursor-pointer"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
