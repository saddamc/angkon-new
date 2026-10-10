"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Settings,
  Globe,
  Phone,
  Mail,
  Store,
  Save,
  Bell,
  Shield,
  Palette,
  Truck,
} from "lucide-react";

/* ─── Settings Page ───────────────────────────────────────────────── */
export default function AdminSettingsPage() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  const tabs = [
    { key: "general", label: "General", icon: Store },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "shipping", label: "Shipping", icon: Truck },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "security", label: "Security", icon: Shield },
  ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <Settings className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
          <p className="text-[12px] text-gray-400">
            Manage your store preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        {/* ── Sidebar Tabs ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-purple-100/60 p-3 shadow-sm h-fit">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                    : "text-gray-500 hover:bg-purple-50 hover:text-purple-600"
                }`}
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-purple-100/60 p-6 shadow-sm">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  General Settings
                </h2>
                <p className="text-[13px] text-gray-400">
                  Configure your store&apos;s basic information
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Store Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      defaultValue="ANGKON"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      defaultValue="https://netbazarbd.net"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      defaultValue="+880 1974-544443"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      defaultValue="admin@netbazarbd.net"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Store Description
                </label>
                <textarea
                  defaultValue="Premium football jersey ecommerce store"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  Notification Settings
                </h2>
                <p className="text-[13px] text-gray-400">
                  Configure when to receive notifications
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: "New Order Notification",
                    desc: "Get notified when a new order is placed",
                    enabled: true,
                  },
                  {
                    label: "Order Status Change",
                    desc: "Notify when order status is updated",
                    enabled: true,
                  },
                  {
                    label: "Low Stock Alert",
                    desc: "Alert when product stock is low",
                    enabled: false,
                  },
                  {
                    label: "Customer Registration",
                    desc: "Notify when a new customer registers",
                    enabled: false,
                  },
                  {
                    label: "WhatsApp Notifications",
                    desc: "Send order updates via WhatsApp",
                    enabled: true,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl border border-purple-100/60 hover:bg-purple-50/30 transition"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-gray-700">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-gray-400">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={item.enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  Shipping Settings
                </h2>
                <p className="text-[13px] text-gray-400">
                  Managed via WooCommerce — these are read from your WordPress
                  shipping zones
                </p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-[13px] text-purple-700 font-medium">
                  Shipping zones and rates are configured in your WooCommerce
                  admin panel at{" "}
                  <a
                    href="https://netbazarbd.net/wp-admin/admin.php?page=wc-settings&tab=shipping"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold"
                  >
                    WooCommerce → Settings → Shipping
                  </a>
                </p>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  Appearance
                </h2>
                <p className="text-[13px] text-gray-400">
                  Customize your store&apos;s look and feel
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Purple (Default)", color: "bg-purple-600", active: true },
                  { label: "Blue", color: "bg-blue-600", active: false },
                  { label: "Emerald", color: "bg-emerald-600", active: false },
                ].map((theme, i) => (
                  <button
                    key={i}
                    className={`rounded-xl p-4 border-2 transition-all ${
                      theme.active
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full ${theme.color} mx-auto mb-2`}
                    />
                    <p className="text-[12px] font-medium text-gray-600">
                      {theme.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  Security
                </h2>
                <p className="text-[13px] text-gray-400">
                  Manage your account security
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-purple-100">
                <button
                  onClick={logout}
                  className="rounded-xl bg-red-50 border border-red-200 px-5 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-100 transition"
                >
                  Sign Out of All Devices
                </button>
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="mt-8 pt-5 border-t border-purple-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-purple-500 transition shadow-md shadow-purple-200 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
