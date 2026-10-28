"use client";

import { useEffect, useState } from "react";
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Save,
  Info,
  ExternalLink,
  Code,
  Zap,
  Lock,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PixelSettings } from "@/server/pixel-settings";

export default function MetaConversionsApiPage() {
  const [settings, setSettings] = useState<PixelSettings | null>(null);
  const [capiToken, setCapiToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/pixel")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          setCapiToken(data.capiAccessToken || "");
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capiAccessToken: capiToken.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setMessage({ type: "success", text: "Conversions API (CAPI) access token saved to MongoDB Atlas!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save CAPI token." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving CAPI token." });
    } finally {
      setSaving(false);
    }
  };

  const pixelId = settings?.pixelId || "1480517547316620";
  const testCode = settings?.testEventCode || "TEST12345";

  const sampleCapiPayload = {
    data: [
      {
        event_name: "Purchase",
        event_time: 1740000000,
        event_id: "order_ANG_84920",
        event_source_url: "https://angkon.com.bd/thankyou-for-shopping",
        action_source: "website",
        user_data: {
          em: "2492f31e86... (SHA-256 hashed customer email)",
          ph: "8f76e3312a... (SHA-256 hashed phone number)",
          client_ip_address: "103.145.12.44",
          client_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
          fbp: "fb.1.1684920194.2049281",
        },
        custom_data: {
          currency: "BDT",
          value: 6500,
          content_type: "product",
          contents: [
            { id: "PRD-001", quantity: 1, item_price: 4500 },
            { id: "PRD-004", quantity: 1, item_price: 2000 },
          ],
        },
        test_event_code: testCode,
      },
    ],
  };

  const copyPayload = () => {
    void navigator.clipboard.writeText(JSON.stringify(sampleCapiPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl pb-20">
      {/* ── Meta Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── Toast Alerts ── */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 border shadow-sm transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-[13px] font-medium">{message.text}</div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Header Banner ── */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50/40 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
              <Server className="h-3.5 w-3.5" />
              <span>Conversions API (CAPI) Gateway</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Server-Side Event Tracking &amp; Deduplication
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Meta Conversions API creates a direct, server-to-server connection between your Next.js application and Meta&apos;s Graph API. It restores conversion data lost to ad-blockers, iOS privacy restrictions, and network drops with zero duplicate reporting.
            </p>
          </div>

          <a
            href={`https://adsmanager.facebook.com/events_manager2/list/dataset/${pixelId}/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <span>Generate CAPI Token in Meta</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* ── 3 Architecture Benefit Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Ad-Blocker Resilience</span>
          </div>
          <div className="text-xl font-bold text-stone-900">Bypasses Client Blockers</div>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Events dispatch from Next.js server runtime directly to Meta Graph API, unaffected by browser extensions.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-2">
            <Zap className="h-4 w-4" />
            <span>Deduplication Algorithm</span>
          </div>
          <div className="text-xl font-bold text-stone-900">Matching `event_id`</div>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            When both browser and server fire the same event with matching IDs, Meta automatically merges them with 0 duplicate counts.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider mb-2">
            <Lock className="h-4 w-4" />
            <span>Data Privacy Compliance</span>
          </div>
          <div className="text-xl font-bold text-stone-900">SHA-256 Hashing</div>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            All customer parameters (email, phone, name) are strictly hashed before leaving your secure server infrastructure.
          </p>
        </div>
      </div>

      {/* ── Token Configuration Form ── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-stone-900">System User Access Token</h3>
          <p className="text-[13px] text-stone-500">
            Generate a permanent access token in Meta Events Manager &gt; Settings &gt; Conversions API &gt; &quot;Generate access token&quot;
          </p>
        </div>

        <form onSubmit={handleSaveToken} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-stone-600 mb-2">
              Meta Graph API Access Token
            </label>
            <input
              type="password"
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
              placeholder="EAAG... (Paste Meta Conversions API System User Token)"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-mono text-stone-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save CAPI Access Token"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Server Payload Preview ── */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-stone-800">
              Meta Graph API POST Endpoint &amp; Payload Schema
            </h3>
          </div>
          <button
            type="button"
            onClick={copyPayload}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            {copiedPayload ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedPayload ? "Copied!" : "Copy Payload Schema"}</span>
          </button>
        </div>

        <div className="p-4 bg-stone-900 font-mono text-xs overflow-x-auto text-stone-200">
          <div className="text-stone-400 mb-2 text-[11px]">
            POST https://graph.facebook.com/v19.0/{pixelId}/events
          </div>
          <pre className="text-emerald-400" suppressHydrationWarning>
            {JSON.stringify(sampleCapiPayload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
