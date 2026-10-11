"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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

  const tabs = [
    { key: "general", label: "General", icon: Store },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "shipping", label: "Shipping", icon: Truck },
    { key: "checkout", label: "Checkout", icon: ShoppingCart },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
          <Settings className="h-5 w-5 text-[#400604]" />
        </div>
        <div>
          <h1 className="text-xl font-serif font-bold text-[#1A0302]">Settings & Configuration</h1>
          <p className="text-[12px] text-stone-500">ANGKON Executive Suite parameters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-3 shadow-sm h-fit">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-[#400604] text-white shadow-sm"
                    : "text-stone-600 hover:bg-[#400604]/5 hover:text-[#400604]"
                }`}
              >
                <tab.icon className={`h-4 w-4 flex-shrink-0 ${activeTab === tab.key ? "text-[#E1B76F]" : ""}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-6 shadow-sm">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-1">General Information</h2>
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
                    Executive / Order Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input type="email" value="angkonofficial08@gmail.com" readOnly disabled className={inputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                  Storefront Description
                </label>
                <textarea
                  value="Exclusive Luxury Fashion & Royal Apparel Maison powered by Next.js & MongoDB Atlas."
                  rows={3}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[13px] text-stone-600 cursor-not-allowed resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-1">Notification Dispatchers</h2>
                <p className="text-[13px] text-stone-500">
                  Transactional order emails powered by <strong>Resend</strong> (<code className="text-[12px] bg-stone-100 px-1 py-0.5 rounded">noreply@angkon.net</code>)
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Customer Confirmation Email", desc: "Instant branded receipt with order ID dispatched to customer via Resend", enabled: true },
                  { label: "Executive Admin Order Alert", desc: "Real-time dispatch to angkonofficial08@gmail.com upon checkout", enabled: true },
                  { label: "Order Status Lifecycle Updates", desc: "Notify client upon order confirmation, dispatch, and delivery", enabled: true },
                  { label: "Low Inventory Notification", desc: "Alert administrator when items drop below threshold", enabled: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-[#FDFBF7]"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#1A0302]">{item.label}</p>
                      <p className="text-[11px] text-stone-500">{item.desc}</p>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full relative ${item.enabled ? "bg-[#400604]" : "bg-stone-300"}`}
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

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-1">Brand Aesthetics</h2>
                <p className="text-[13px] text-stone-500">ANGKON official luxury theme configuration</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl p-4 border-2 border-[#400604] bg-[#400604]/5 text-center">
                  <div className="h-9 w-9 rounded-full bg-[#400604] border-2 border-[#E1B76F] mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-[#400604]">Royal Wine Maroon</p>
                  <p className="text-[11px] text-stone-500">#400604 / Primary Brand</p>
                </div>
                <div className="rounded-xl p-4 border border-stone-200 bg-white text-center">
                  <div className="h-9 w-9 rounded-full bg-[#E1B76F] border border-amber-300 mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-stone-800">Imperial Gold</p>
                  <p className="text-[11px] text-stone-500">#E1B76F / Accents</p>
                </div>
                <div className="rounded-xl p-4 border border-stone-200 bg-white text-center">
                  <div className="h-9 w-9 rounded-full bg-[#1A0302] border border-stone-400 mx-auto mb-2 shadow-sm" />
                  <p className="text-[13px] font-bold text-stone-800">Deep Obsidian</p>
                  <p className="text-[11px] text-stone-500">#1A0302 / Luxury Footer</p>
                </div>
              </div>

              <PromoSettings />
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-1">Access Control & Security</h2>
                <p className="text-[13px] text-stone-500">
                  Authentication secured by HttpOnly session tokens and server-side middleware verification
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#FDFBF7] p-4 text-[13px] text-stone-700 leading-relaxed">
                Credentials are systematically managed via <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono font-bold">ADMIN_USERNAME</code> and{" "}
                <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono font-bold">ADMIN_PASSWORD</code> in your secure environment. HttpOnly cookies prevent XSS credential interception.
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl bg-rose-50 border border-rose-200 px-5 py-2.5 text-[13px] font-bold text-rose-700 hover:bg-rose-100 transition"
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
