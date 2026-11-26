"use client";

import { useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  MailCheck,
  MapPin,
  Package,
  Pencil,
  Phone,
  ShieldAlert,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import type { AccountNotice, AccountOrderSummary, AccountUserProfile } from "@/types/account";
import {
  AccountFieldLabel,
  accountInputClass,
  accountSecondaryBtnClass,
  formatBDT,
  postJson,
} from "./account-ui";

interface AccountHeroHeaderProps {
  user: AccountUserProfile;
  orders: AccountOrderSummary[];
  totalSpent: number;
  submitting: boolean;
  onLogout: () => void;
  onResendVerification: () => void;
  onGoToSecurity: () => void;
  onGoToAddresses: () => void;
  onProfileUpdated: (user: AccountUserProfile) => void;
  onNotice: (n: AccountNotice) => void;
  codeFormOpen: boolean;
  codeInput: string;
  codeBusy: boolean;
  codeSending: boolean;
  codeError: string | null;
  codeResendAfter: number;
  onOpenCodeVerification: () => void;
  onCloseCodeForm: () => void;
  onCodeInputChange: (digits: string) => void;
  onSubmitVerifyCode: (digits: string) => Promise<void>;
  onSendVerificationCode: () => Promise<void>;
}

export function AccountHeroHeader({
  user,
  orders,
  totalSpent,
  submitting,
  onLogout,
  onResendVerification,
  onGoToSecurity,
  onGoToAddresses,
  onProfileUpdated,
  onNotice,
  codeFormOpen,
  codeInput,
  codeBusy,
  codeSending,
  codeError,
  codeResendAfter,
  onOpenCodeVerification,
  onCloseCodeForm,
  onCodeInputChange,
  onSubmitVerifyCode,
  onSendVerificationCode,
}: AccountHeroHeaderProps) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name || "");
  const [editPhone, setEditPhone] = useState(user.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const initials = (user.name || "A")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const activeOrdersCount = orders.filter(
    (o) =>
      !["delivered", "completed", "cancelled", "returned", "refunded", "failed"].includes(
        String(o.orderStatus || "").toLowerCase()
      )
  ).length;

  const defaultAddress = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];

  const handleOpenEdit = () => {
    setEditName(user.name || "");
    setEditPhone(user.phone || "");
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { ok, data } = await postJson(
        "/api/account/profile",
        { name: editName, phone: editPhone },
        "PATCH"
      );
      if (!ok) {
        onNotice({ text: data.error || "Could not update profile details.", type: "error" });
        return;
      }
      onProfileUpdated(data.user as AccountUserProfile);
      setEditingProfile(false);
      onNotice({ text: "Your profile details have been updated.", type: "success" });
    } catch {
      onNotice({ text: "Network error while saving your profile.", type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Email Verification Reminder Banner */}
      {!user.emailVerified && (
        <div className="space-y-3">
          <div className="flex flex-col gap-4 rounded-2xl border border-amber-400/50 bg-[#3b050b] p-5 sm:flex-row sm:items-center sm:justify-between shadow-xl">
            <div className="flex gap-3.5">
              <ShieldAlert className="h-6 w-6 shrink-0 text-amber-300 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200 text-sm">
                  Verify your email to unlock full order sync &amp; invoices
                </p>
                <p className="text-xs sm:text-[13px] text-[#F5EAE0] mt-1 leading-relaxed">
                  We emailed a link to <strong className="text-white">{user.email}</strong>. You can
                  also enter a 6-digit verification code right here.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenCodeVerification}
                disabled={codeFormOpen && codeSending}
                className="rounded-xl bg-[#E1B76F] px-4 py-2 text-xs font-black uppercase text-[#2a0408] hover:bg-[#edd19b] transition shadow-md cursor-pointer"
              >
                Verify with code
              </button>
              <button
                type="button"
                onClick={onResendVerification}
                disabled={submitting}
                className="rounded-xl border border-amber-300/60 bg-amber-950/50 px-4 py-2 text-xs font-bold uppercase text-amber-100 hover:bg-amber-900/60 transition cursor-pointer"
              >
                Resend link
              </button>
            </div>
          </div>

          {codeFormOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (codeInput.length === 6) void onSubmitVerifyCode(codeInput);
              }}
              className="rounded-2xl border border-[#E1B76F]/35 bg-[#3b050b] p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <MailCheck className="h-4 w-4 text-[#E1B76F]" />
                    Enter 6-digit verification code
                  </p>
                  <p className="text-xs text-[#F5EAE0] mt-0.5">
                    {codeSending
                      ? `Sending a 6-digit code to ${user.email}…`
                      : `Sent to ${user.email}. Enter the code below (expires in 10 minutes).`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseCodeForm}
                  className="text-xs font-semibold text-white/80 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  autoComplete="one-time-code"
                  value={codeInput}
                  disabled={codeBusy}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                    onCodeInputChange(digits);
                    if (digits.length === 6) void onSubmitVerifyCode(digits);
                  }}
                  placeholder="000000"
                  className={`${accountInputClass} sm:w-48 text-center font-mono text-xl tracking-[0.4em] font-bold`}
                />
                <button
                  type="submit"
                  disabled={codeBusy || codeInput.length < 6}
                  className="rounded-xl bg-[#E1B76F] px-5 py-3 text-xs font-black uppercase text-[#2a0408] hover:bg-[#edd19b] transition disabled:opacity-50 cursor-pointer"
                >
                  {codeBusy ? "Verifying…" : "Confirm Code"}
                </button>
                <button
                  type="button"
                  disabled={codeResendAfter > 0 || codeSending}
                  onClick={() => void onSendVerificationCode()}
                  className="text-xs font-semibold text-[#E1B76F] hover:underline disabled:opacity-50 cursor-pointer sm:ml-auto"
                >
                  {codeResendAfter > 0 ? `Resend in ${codeResendAfter}s` : "Resend code"}
                </button>
              </div>
              {codeError && (
                <p role="alert" className="text-xs text-rose-200 font-medium">
                  {codeError}
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Checkout-Created Password Setup Prompt */}
      {!user.hasPassword && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E1B76F]/35 bg-[#3b050b] p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between shadow-lg">
          <div className="flex items-start gap-3">
            <KeyRound className="h-5 w-5 shrink-0 text-[#E1B76F] mt-0.5" />
            <div>
              <p className="font-bold text-white text-sm">Set a password for faster sign-in</p>
              <p className="text-xs text-[#EADBC8] mt-0.5">
                Your account was auto-created during checkout. Add a password anytime in Security &amp; Access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToSecurity}
            className="shrink-0 rounded-xl bg-[#E1B76F] px-4 py-2 text-xs font-black uppercase text-[#2a0408] hover:bg-[#edd19b] transition shadow-md cursor-pointer"
          >
            Set Password
          </button>
        </div>
      )}

      {/* Member Overview Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 sm:p-8 shadow-xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#E1B76F]/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E1B76F]/15">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-[#E1B76F] bg-[#2b0408] text-xl font-black text-[#E1B76F] shadow-lg">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                  {user.name}
                </h1>
                {user.emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/75 border border-emerald-400/45 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Verified Member
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-[13px] text-[#F5EAE0]">
                <span>{user.email}</span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1 text-white font-medium">
                    <Phone className="h-3.5 w-3.5 text-[#E1B76F]" /> {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={() => (editingProfile ? setEditingProfile(false) : handleOpenEdit())}
              className={accountSecondaryBtnClass}
            >
              {editingProfile ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {editingProfile ? "Cancel Edit" : "Edit Profile"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-[#2b0408] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/90 hover:border-rose-300/60 hover:text-rose-200 transition disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Inline Edit Profile Drawer */}
        {editingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-5 rounded-2xl border border-[#E1B76F]/30 bg-[#2b0408] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
          >
            <div className="sm:col-span-5">
              <AccountFieldLabel required>Full Name</AccountFieldLabel>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={accountInputClass}
                placeholder="Your full name"
              />
            </div>
            <div className="sm:col-span-4">
              <AccountFieldLabel>Mobile Number</AccountFieldLabel>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className={accountInputClass}
                placeholder="017XXXXXXXX"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#edd19b] py-3 px-4 text-xs font-black uppercase tracking-wider text-[#2a0408] hover:brightness-105 disabled:opacity-50 cursor-pointer transition"
              >
                {savingProfile ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Clean Summary Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6">
          <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#2b0408] p-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#EADBC8] font-bold">
              <span>Orders Placed</span>
              <Package className="h-4 w-4 text-[#E1B76F]" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-white tabular-nums">{orders.length}</p>
            <p className="mt-0.5 text-xs text-white/70">Total orders</p>
          </div>

          <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#2b0408] p-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#EADBC8] font-bold">
              <span>In Progress</span>
              <Truck className="h-4 w-4 text-[#E1B76F]" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-white tabular-nums">{activeOrdersCount}</p>
            <p className="mt-0.5 text-xs text-white/70">Active deliveries</p>
          </div>

          <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#2b0408] p-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#EADBC8] font-bold">
              <span>Total Spend</span>
              <Sparkles className="h-4 w-4 text-[#E1B76F]" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-[#E1B76F] tabular-nums">{formatBDT(totalSpent)}</p>
            <p className="mt-0.5 text-xs text-white/70">Confirmed purchases</p>
          </div>

          <button
            type="button"
            onClick={onGoToAddresses}
            className="text-left rounded-2xl border border-[#E1B76F]/20 bg-[#2b0408] p-4 hover:border-[#E1B76F]/55 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#EADBC8] font-bold">
              <span>Default Address</span>
              <MapPin className="h-4 w-4 text-[#E1B76F]" />
            </div>
            <p className="mt-1.5 text-lg sm:text-xl font-black text-white truncate">
              {defaultAddress ? defaultAddress.district || defaultAddress.city : "Add Address"}
            </p>
            <p className="mt-0.5 text-xs text-[#E1B76F] font-semibold">
              {user.addresses?.length
                ? `${user.addresses.length} saved • Edit`
                : "Save address →"}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
