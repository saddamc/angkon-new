"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, LogOut, MailCheck, ShieldCheck } from "lucide-react";
import type { AccountNotice, AccountUserProfile } from "@/types/account";
import {
  AccountFieldLabel,
  AccountPasswordInput,
  accountPrimaryBtnClass,
  accountSecondaryBtnClass,
  postJson,
} from "./account-ui";

const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

interface AccountSecurityPanelProps {
  user: AccountUserProfile;
  submitting: boolean;
  onUserUpdated: (user: AccountUserProfile) => void;
  onNotice: (notice: AccountNotice) => void;
  onOpenCodeVerification: () => void;
  onResendVerification: () => void;
  onLogout: () => void;
}

export function AccountSecurityPanel({
  user,
  submitting,
  onUserUpdated,
  onNotice,
  onOpenCodeVerification,
  onResendVerification,
  onLogout,
}: AccountSecurityPanelProps) {
  const needsPassword = !user.hasPassword;
  const [newPass, setNewPass] = useState("");
  const [currentPass, setCurrentPass] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(needsPassword);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const { ok, data } = await postJson("/api/auth/set-password", {
        password: newPass,
        currentPassword: user.hasPassword ? currentPass : undefined,
      });
      if (!ok) {
        onNotice({ text: data.error || "Couldn't save the password.", type: "error" });
        return;
      }
      setNewPass("");
      setCurrentPass("");
      setShowChangePassword(false);
      onUserUpdated(data.user as AccountUserProfile);
      onNotice({ text: "Your password has been saved.", type: "success" });
    } catch {
      onNotice({ text: "Network error while saving password.", type: "error" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Verification & Email Security Card */}
      <div className="rounded-3xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 shadow-xl flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[#E1B76F]/15 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E1B76F]/35 bg-[#2b0408] text-[#E1B76F]">
              <MailCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-black uppercase text-white">
                Email &amp; Order Protection
              </h2>
              <p className="text-xs text-[#EADBC8]">
                Keeps your order history and invoices private to your email
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#2b0408] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#EADBC8] font-medium">Primary Email</span>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/45 bg-emerald-950/70 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/45 bg-amber-950/70 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                  Needs Verification
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-white break-all">{user.email}</p>
            <p className="text-xs text-white/80 leading-relaxed pt-1">
              {user.emailVerified
                ? "Orders placed with this email are automatically synced to your account."
                : "Verify your email using a 6-digit code or confirmation link to sync past guest orders."}
            </p>
          </div>

          {!user.emailVerified && (
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenCodeVerification}
                className="rounded-xl bg-[#E1B76F] px-4 py-2.5 text-xs font-black uppercase text-[#2a0408] hover:bg-[#edd19b] transition cursor-pointer"
              >
                Verify with 6-digit code
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={onResendVerification}
                className={accountSecondaryBtnClass}
              >
                Resend link
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E1B76F]/15 flex items-center justify-between gap-3">
          <div className="text-xs text-white/80 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Protected customer session</span>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onLogout}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#2b0408] px-3.5 py-2 text-xs font-bold uppercase text-white/90 hover:border-rose-300/60 hover:text-rose-200 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Password & Sign-in Credentials Card */}
      <div className="rounded-3xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-[#E1B76F]/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E1B76F]/35 bg-[#2b0408] text-[#E1B76F]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-black uppercase text-white">
                {needsPassword ? "Set Account Password" : "Password Management"}
              </h2>
              <p className="text-xs text-[#EADBC8]">
                {needsPassword
                  ? "Optional: sign in anytime without waiting for email codes"
                  : "Keep your account credentials private and up to date"}
              </p>
            </div>
          </div>

          {!needsPassword && !showChangePassword && (
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className={accountSecondaryBtnClass}
            >
              Change
            </button>
          )}
        </div>

        {showChangePassword || needsPassword ? (
          <form onSubmit={handleSetPassword} className="space-y-4">
            {user.hasPassword && (
              <div>
                <AccountFieldLabel required>Current Password</AccountFieldLabel>
                <AccountPasswordInput
                  value={currentPass}
                  onChange={setCurrentPass}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
              </div>
            )}

            <div>
              <AccountFieldLabel required>
                {user.hasPassword ? "New Password" : "Create Password"}
              </AccountFieldLabel>
              <AccountPasswordInput
                value={newPass}
                onChange={setNewPass}
                placeholder={PASSWORD_HINT}
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={savingPassword}
                className={`${accountPrimaryBtnClass} sm:flex-1`}
              >
                {savingPassword
                  ? "Saving…"
                  : user.hasPassword
                  ? "Update Password"
                  : "Save Password"}
              </button>
              {user.hasPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPass("");
                    setNewPass("");
                  }}
                  className="rounded-xl border border-white/25 px-5 py-3 text-xs font-bold uppercase text-white hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#2b0408] p-4 space-y-2 text-xs text-white/85">
            <p className="font-bold text-white text-sm">Password is set</p>
            <p className="text-[#EADBC8] leading-relaxed">
              You can sign in using your email and password or request a 6-digit one-time code anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
