"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  emailVerified: boolean;
  createdAt?: string | null;
}

function initialsOf(name?: string): string {
  const value = String(name || "")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return value || "AD";
}

export default function AdminProfilePage() {
  const { authFetch } = useAuth();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch("/api/admin/profile");
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (active) setLoadError(data?.error || "Could not load your profile.");
          return;
        }
        if (!active) return;
        const p = data.profile as AdminProfile;
        setProfile(p);
        setName(p.name);
        setEmail(p.email);
        setPhone(p.phone || "");
      } catch {
        if (active) setLoadError("Connection error while loading your profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authFetch]);

  const saveProfile = async () => {
    setProfileError(null);
    setProfileSaved(false);

    if (name.trim().length < 2) {
      setProfileError("Name must be at least 2 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileError("Enter a valid email address.");
      return;
    }
    if (phone.trim() && !/^[0-9+\-\s()]{6,20}$/.test(phone.trim())) {
      setProfileError("Enter a valid phone number.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authFetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileError(data?.error || "Profile update failed.");
        return;
      }
      const updated = data.profile as AdminProfile;
      setProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setPhone(updated.phone || "");
      setProfileSaved(true);
      window.dispatchEvent(new Event("admin-profile-updated"));
    } catch {
      setProfileError("Connection error while saving your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    setPasswordError(null);
    setPasswordSaved(false);

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authFetch("/api/admin/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPasswordError(data?.error || "Password update failed.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
    } catch {
      setPasswordError("Connection error while updating your password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-48 animate-pulse rounded-xl bg-purple-100/60" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
          <div className="h-64 animate-pulse rounded-2xl border border-stone-200 bg-white" />
          <div className="h-64 animate-pulse rounded-2xl border border-stone-200 bg-white" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {loadError}
        </p>
        <Link
          href="/admin/orders"
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-purple-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>
      </div>
    );
  }

  const isSuperAdmin = profile?.role === "superadmin";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-BD", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100/80 bg-purple-50 text-purple-600 shadow-sm">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Profile</h1>
            <p className="text-[12.5px] text-gray-500">
              Manage your account details and sign-in security.
            </p>
          </div>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:border-purple-300 hover:text-purple-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        {/* Identity card */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-col items-center text-center">
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-full text-[24px] font-bold text-white shadow-md ${
                  isSuperAdmin
                    ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 ring-4 ring-purple-100"
                    : "bg-gradient-to-br from-purple-500 to-purple-600 ring-4 ring-purple-100"
                }`}
              >
                {initialsOf(profile?.name)}
              </span>
              <h2 className="mt-3 text-[16px] font-bold text-gray-900">{profile?.name}</h2>
              <span
                className={`mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isSuperAdmin
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {isSuperAdmin ? "SUPER ADMINISTRATOR" : "ADMINISTRATOR"}
              </span>
            </div>

            <dl className="mt-5 space-y-3 border-t border-stone-100 pt-4 text-[12px]">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Login email
                  </dt>
                  <dd className="truncate font-semibold text-gray-800">{profile?.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Phone
                  </dt>
                  <dd className="truncate font-semibold text-gray-800">
                    {profile?.phone || "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Member since
                  </dt>
                  <dd className="font-semibold text-gray-800">{memberSince}</dd>
                </div>
              </div>
            </dl>

            <div
              className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                profile?.emailVerified
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
              {profile?.emailVerified ? "Email verified" : "Email not verified"}
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-purple-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Account security
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-purple-700/80">
              Your session is protected by an HttpOnly cookie. Changing your password signs out
              nothing automatically — use a unique password you do not reuse elsewhere.
            </p>
          </div>
        </div>

        {/* Forms */}
        <div className="space-y-4">
          {/* Profile details */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveProfile();
            }}
            className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-purple-600" />
              <h2 className="text-[13px] font-bold text-gray-800">Profile details</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">
              This name appears in the sidebar and on audit records.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-gray-500">Full name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  placeholder="Administrator name"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-gray-500">Login email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  placeholder="admin@example.com"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10.5px] font-semibold text-gray-500">
                  Phone (optional)
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  placeholder="01XXXXXXXXX"
                />
              </label>
            </div>

            {profileError && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {profileError}
              </p>
            )}
            {profileSaved && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Profile updated.
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700 disabled:opacity-60"
              >
                {savingProfile ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savingProfile ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>

          {/* Password */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void savePassword();
            }}
            className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-purple-600" />
              <h2 className="text-[13px] font-bold text-gray-800">Change password</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Minimum 8 characters. You will keep your current session.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 sm:col-span-3">
                <span className="text-[10.5px] font-semibold text-gray-500">
                  Current password
                </span>
                <input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-gray-500">New password</span>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-gray-500">
                  Confirm password
                </span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </label>
            </div>

            {passwordError && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {passwordError}
              </p>
            )}
            {passwordSaved && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Password updated.
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2 text-[12px] font-bold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
              >
                {savingPassword ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <KeyRound className="h-3.5 w-3.5" />
                )}
                {savingPassword ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
