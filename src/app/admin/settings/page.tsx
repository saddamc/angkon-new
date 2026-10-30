"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { PromoSettings } from "./promo-settings";
import { ShippingSettings } from "./shipping-settings";
import { CheckoutSettings } from "./checkout-settings";

const STORE_URL = "https://angkon.net";

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-4 py-2.5 text-[13px] text-stone-600 cursor-not-allowed";

export default function AdminSettingsPage() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [mail, setMail] = useState<{ orderEmails: string[]; senderEmail: string; emailServiceConfigured: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/general", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMail(d))
      .catch(() => {});
  }, []);

  const orderEmailText = !mail ? "Loading…" : mail.orderEmails.length ? mail.orderEmails.join(", ") : "Not configured — set ADMIN_EMAIL";
  const alertTargets = mail?.orderEmails.length ? mail.orderEmails.join(", ") : "the configured order email";

  const isDevMode =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_META_ROUTES === "true";

  const tabs = [
    { key: "general", label: "General", icon: Store },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "shipping", label: "Shipping", icon: Truck },
    { key: "checkout", label: "Checkout", icon: ShoppingCart },
    ...(isDevMode ? [{ key: "pixel", label: "Meta Pixel", icon: Activity }] : []),
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
                onClick={() => setActiveTab(tab.key)}
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

              <div className="space-y-4">
                {[
                  { label: "Customer Confirmation Email", desc: "Instant branded receipt with order ID dispatched to customer via Resend", enabled: true },
                  { label: "New Order Alert", desc: `Real-time dispatch to ${alertTargets} upon checkout`, enabled: Boolean(mail?.orderEmails.length) },
                  { label: "Order Status Lifecycle Updates", desc: "Notify client upon order confirmation, dispatch, and delivery", enabled: true },
                  { label: "Low Inventory Notification", desc: "Alert administrator when items drop below threshold", enabled: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 rounded-xl border border-purple-100/60 bg-stone-50/50"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-gray-800">{item.label}</p>
                      <p className="text-[11px] text-stone-500">{item.desc}</p>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full relative transition-colors ${item.enabled ? "bg-purple-600" : "bg-stone-300"}`}
                      aria-hidden
                    >
                      <span
                        className={`absolute top-[2px] h-5 w-5 rounded-full bg-white border border-stone-200 shadow-sm transition-all ${
                          item.enabled ? "right-[2px]" : "left-[2px]"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "shipping" && <ShippingSettings />}

          {activeTab === "checkout" && <CheckoutSettings />}

          {activeTab === "pixel" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Meta (Facebook) Pixel Integration</h2>
                  <p className="text-[13px] text-stone-500">
                    Manage your store pixel dataset ID, view live tracked events, and test conversion telemetry
                  </p>
                </div>
                <Link
                  href="/admin/pixel"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <span>Open Dedicated Pixel Suite</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Full Telemetry Dashboard Available
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  We have provided a dedicated administrative route at{" "}
                  <Link href="/admin/pixel" className="underline font-bold text-blue-900 hover:text-blue-700">
                    /admin/pixel
                  </Link>{" "}
                  featuring real-time event simulation, PageView/AddToCart/Purchase event diagnostics, and instant database updates.
                </p>
                <div className="pt-2">
                  <Link
                    href="/admin/meta"
                    className="inline-flex items-center gap-2 rounded-lg bg-white border border-blue-200 px-4 py-2 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-50 transition"
                  >
                    <span>Open Meta Events Manager</span>
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
                  <div className="h-9 w-9 rounded-full bg-[#400604] border-2 border-[#E1B76F] mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-gray-900">Royal Wine Maroon</p>
                  <p className="text-[11px] text-gray-500">#400604 / Primary Brand</p>
                </div>
                <div className="rounded-xl p-4 border border-purple-100/60 bg-white text-center shadow-xs">
                  <div className="h-9 w-9 rounded-full bg-[#E1B76F] border border-amber-300 mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-gray-900">Imperial Gold</p>
                  <p className="text-[11px] text-gray-500">#E1B76F / Accents</p>
                </div>
                <div className="rounded-xl p-4 border border-purple-100/60 bg-white text-center shadow-xs">
                  <div className="h-9 w-9 rounded-full bg-[#1A0302] border border-stone-400 mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-gray-900">Deep Obsidian</p>
                  <p className="text-[11px] text-gray-500">#1A0302 / Luxury Footer</p>
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

              <div className="rounded-xl border border-purple-100/60 bg-stone-50/50 p-4 text-[13px] text-stone-700 leading-relaxed">
                Credentials are systematically managed via <code className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded font-mono font-bold">ADMIN_USERNAME</code> and{" "}
                <code className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded font-mono font-bold">ADMIN_PASSWORD</code> in your secure environment. HttpOnly cookies prevent XSS credential interception.
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
