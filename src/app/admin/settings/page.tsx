"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Settings,
  Globe,
  Phone,
  Mail,
  Store,
  Bell,
  Shield,
  Palette,
  Truck,
  ShoppingCart,
  Activity,
  ExternalLink,
  Lock,
} from "lucide-react";
import { PromoSettings } from "./promo-settings";
import { ShippingSettings } from "./shipping-settings";
import { CheckoutSettings } from "./checkout-settings";
import { CourierSettings } from "./courier-settings";

const STORE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://angkon.net";

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-4 py-2.5 text-[13px] text-stone-600 cursor-not-allowed";

export default function AdminSettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState("general");
  const [role, setRole] = useState<string>("admin");
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/login", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.role) {
          setRole(data.role);
        }
      })
      .catch(() => {})
      .finally(() => setRoleLoaded(true));
  }, []);

  const isSuperAdmin = role === "superadmin";

  const SUPERADMIN_TABS = ["courier", "checkout"];
  const ALL_TABS = [
    "general",
    "notifications",
    "shipping",
    "courier",
    "checkout",
    "pixel",
    "appearance",
    "security",
  ];

  // Deep links (?tab=...) must actually switch tabs, including client-side
  // navigation between settings links. Restricted tabs show an explicit
  // access panel instead of silently falling back to General.
  useEffect(() => {
    if (!roleLoaded || !requestedTab) return;
    if (!ALL_TABS.includes(requestedTab)) {
      setActiveTab("general");
      return;
    }
    if (SUPERADMIN_TABS.includes(requestedTab) && !isSuperAdmin) {
      setActiveTab("restricted");
      return;
    }
    setActiveTab(requestedTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab, roleLoaded, isSuperAdmin]);

  const selectTab = (key: string) => {
    setActiveTab(key);
    router.replace(`/admin/settings?tab=${key}`, { scroll: false });
  };
  const [mail, setMail] = useState<{ orderEmails: string[]; senderEmail: string; emailServiceConfigured: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/general", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMail(d))
      .catch(() => {});
  }, []);

  const orderEmailText = !mail ? "Loading…" : mail.orderEmails.length ? mail.orderEmails.join(", ") : "Not configured — set ADMIN_EMAIL";
  const alertTargets = mail?.orderEmails.length ? mail.orderEmails.join(", ") : "the configured order email";

  const tabs = [
    { key: "general", label: "General", icon: Store },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "shipping", label: "Shipping", icon: Truck },
    ...(isSuperAdmin ? [{ key: "courier", label: "Courier & Dispatch", icon: Truck }] : []),
    ...(isSuperAdmin ? [{ key: "checkout", label: "Payments & Checkout", icon: ShoppingCart }] : []),
    { key: "pixel", label: "Meta Pixel & CAPI", icon: Activity },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center">
          <Settings className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Settings & Configuration</h1>
          <p className="text-[12px] text-stone-500">ANGKON Admin Configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-purple-100/60 p-3 shadow-sm h-fit">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                    : "text-stone-600 hover:bg-purple-50 hover:text-purple-600"
                }`}
              >
                <tab.icon className={`h-4 w-4 flex-shrink-0 ${activeTab === tab.key ? "text-purple-200" : ""}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-purple-100/60 p-6 shadow-sm">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">General Information</h2>
                <p className="text-[13px] text-stone-500">Storefront core metadata</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                    Maison / Store Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input type="text" value="ANGKON" readOnly disabled className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                    Storefront URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input type="text" value={STORE_URL} readOnly disabled className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                    Contact Hotline
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input type="text" value="+880 1836-056070" readOnly disabled className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                    Order Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input type="text" value={orderEmailText} readOnly disabled className={inputClass} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-stone-400">
                    New-order alerts are sent here. Set by <code className="font-mono">ADMIN_EMAIL</code> in the server environment (separate several with commas).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Notification Dispatchers</h2>
                <p className="text-[13px] text-stone-500">
                  Transactional order emails powered by <strong>Resend</strong> (sent from <code className="text-[12px] bg-stone-100 px-1 py-0.5 rounded">{mail?.senderEmail ?? "…"}</code>)
                  {mail && !mail.emailServiceConfigured && (
                    <span className="block mt-1 text-rose-600 font-semibold">RESEND_API_KEY is missing — no emails can be sent.</span>
                  )}
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Customer Confirmation Email",
                    desc: "Instant branded receipt with order ID dispatched to customer via Resend",
                    enabled: Boolean(mail?.emailServiceConfigured),
                    statusText: mail?.emailServiceConfigured ? "Active" : "Needs RESEND_API_KEY",
                  },
                  {
                    label: "New Order Alert",
                    desc: `Real-time dispatch to ${alertTargets} upon checkout`,
                    enabled: Boolean(mail?.emailServiceConfigured && mail?.orderEmails.length),
                    statusText:
                      mail?.emailServiceConfigured && mail?.orderEmails.length
                        ? "Active"
                        : "Needs ADMIN_EMAIL",
                  },
                  {
                    label: "Order Status Lifecycle Updates",
                    desc: "Notify client upon order confirmation, dispatch, and delivery",
                    enabled: Boolean(mail?.emailServiceConfigured),
                    statusText: mail?.emailServiceConfigured ? "Active" : "Needs RESEND_API_KEY",
                  },
                  {
                    label: "Low Inventory Notification",
                    desc: "Alert administrator when items drop below threshold",
                    enabled: Boolean(mail?.emailServiceConfigured),
                    statusText: mail?.emailServiceConfigured ? "Active" : "Needs RESEND_API_KEY",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 p-4 rounded-xl border border-purple-100/60 bg-stone-50/50"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-gray-800">{item.label}</p>
                      <p className="text-[11px] text-stone-500">{item.desc}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shrink-0 ${
                        item.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.enabled ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {item.statusText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "shipping" && <ShippingSettings />}

          {activeTab === "restricted" && (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 shadow-xs">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-amber-900">
                  Super administrator access required
                </h2>
                <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-amber-800">
                  Courier dispatch and payment (SSLCOMMERZ) settings are restricted to super
                  administrators. Ask a super administrator to update these settings, or sign in
                  with a super administrator account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectTab("general")}
                className="rounded-xl border border-amber-300 bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-amber-900 hover:bg-amber-100"
              >
                Back to General
              </button>
            </div>
          )}

          {activeTab === "courier" && isSuperAdmin && <CourierSettings />}

          {activeTab === "checkout" && isSuperAdmin && <CheckoutSettings />}

          {activeTab === "pixel" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Meta Pixel &amp; Conversions API</h2>
                  <p className="text-[13px] text-stone-500">
                    Manage your dataset ID, encrypted CAPI tokens, event diagnostics, and live telemetry
                  </p>
                </div>
                <Link
                  href="/admin/meta/settings"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <span>Open Meta Suite Settings</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Centralized Meta Marketing Suite
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Pixel, Conversions API, Catalog Feed, and Domain Verification are managed centrally inside the Meta Marketing Suite with AES-256-GCM token encryption and live Graph API diagnostics.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href="/admin/meta/events"
                    className="inline-flex items-center gap-2 rounded-lg bg-white border border-blue-200 px-4 py-2 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-50 transition"
                  >
                    <span>Open Events Manager</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/admin/integrations"
                    className="inline-flex items-center gap-2 rounded-lg bg-white border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition"
                  >
                    <span>View All Integrations</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Brand Aesthetics</h2>
                <p className="text-[13px] text-stone-500">ANGKON official luxury theme configuration</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl p-4 border border-purple-100/60 bg-white text-center shadow-xs">
                  <div className="h-9 w-9 rounded-full bg-[#530911] border-2 border-[#E1B76F] mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-gray-900">Royal Wine Maroon</p>
                  <p className="text-[11px] text-gray-500">#530911 / Primary Brand</p>
                </div>
                <div className="rounded-xl p-4 border border-purple-100/60 bg-white text-center shadow-xs">
                  <div className="h-9 w-9 rounded-full bg-[#E1B76F] border border-amber-300 mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-gray-900">Imperial Gold</p>
                  <p className="text-[11px] text-gray-500">#E1B76F / Accents</p>
                </div>
                <div className="rounded-xl p-4 border border-purple-100/60 bg-white text-center shadow-xs">
                  <div className="h-9 w-9 rounded-full bg-[#230407] border border-stone-400 mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-gray-900">Deep Obsidian</p>
                  <p className="text-[11px] text-gray-500">#230407 / Luxury Footer</p>
                </div>
              </div>

              <PromoSettings />
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Access Control & Security</h2>
                <p className="text-[13px] text-stone-500">
                  Authentication secured by HttpOnly session tokens and server-side middleware verification
                </p>
              </div>

              <div className="rounded-xl border border-purple-100/60 bg-stone-50/50 p-4 text-[13px] text-stone-700 leading-relaxed space-y-3">
                <p>
                  Admin accounts and role-based permissions are stored in MongoDB and secured with <code className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded font-mono font-bold">HttpOnly</code> JWT session cookies.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/profile"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 transition"
                  >
                    Manage My Password &amp; Profile →
                  </Link>
                  {isSuperAdmin && (
                    <Link
                      href="/admin/users"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
                    >
                      Manage Users &amp; Access →
                    </Link>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl bg-rose-50 border border-rose-200 px-5 py-2.5 text-[13px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  Terminate Admin Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
