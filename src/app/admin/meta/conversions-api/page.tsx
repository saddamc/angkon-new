"use client";

import { useEffect, useState } from "react";
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Save,
  ExternalLink,
  Code,
  Zap,
  Lock,
  PlayCircle,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";

export default function MetaConversionsApiPage() {
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [capiToken, setCapiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/pixel")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicAdminPixelSettings | null) => {
        if (data) {
          setSettings(data);
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = capiToken.trim();
    if (!cleanToken) return;

    if (cleanToken.startsWith("{") || cleanToken.startsWith("[") || cleanToken.includes('"event_name"')) {
      setMessage({
        type: "error",
        text: "You pasted sample JSON payload data instead of a Meta Access Token. A valid Meta Access Token starts with 'EAA' (generated in Meta Events Manager > Settings > Conversions API).",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capiAccessToken: cleanToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setCapiToken("");
        setMessage({
          type: "success",
          text: `Conversions API (CAPI) access token saved securely in database! (${data.settings?.maskedCapiAccessToken || "Configured"})`,
        });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save CAPI token." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving CAPI token." });
    } finally {
      setSaving(false);
    }
  };

  const handleClearToken = async () => {
    if (
      !confirm(
        "Are you sure you want to remove the Conversions API access token? Server-side tracking will be disabled."
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capiAccessToken: "" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setCapiToken("");
        setMessage({ type: "success", text: "CAPI token removed successfully." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error removing CAPI token." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/capi/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelId: settings?.pixelId,
          capiToken: capiToken.trim(),
          testEventCode: settings?.testEventCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: `${data.message} (Trace ID: ${data.fbtraceId || "N/A"})`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Meta Graph API connection test failed.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error testing Meta CAPI connection." });
    } finally {
      setTesting(false);
    }
  };

  const pixelId = settings?.pixelId || "";
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
    <div className="space-y-6 max-w-7xl pb-24 text-stone-900 font-sans antialiased">
      {/* ── 1. Unified Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── 2. Toast Alerts ── */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl p-3.5 border shadow-2xs transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs font-medium">{message.text}</div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 3. Executive Hero Card ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
              <Server className="h-3 w-3 text-indigo-600" />
              <span>Conversions API (CAPI) Gateway v22.0</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Server-Side Event Tracking &amp; Deduplication
            </h1>
            <p className="text-xs sm:text-[13px] text-stone-600 max-w-2xl leading-relaxed">
              Meta Conversions API establishes a direct, encrypted server-to-server connection between your Next.js application runtime and Meta Graph API. It restores conversion data lost to browser ad-blockers, iOS 14.5+ restrictions, and network dropouts.
            </p>
          </div>

          <a
            href={`https://adsmanager.facebook.com/events_manager2/list/dataset/${pixelId}/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 transition cursor-pointer self-start md:self-auto shrink-0"
          >
            <span>Generate CAPI Token in Meta</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* ── 4. Three Architecture Benefit Pillars ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-[11px] uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>Ad-Blocker Resilience</span>
          </div>
          <div className="text-base font-bold text-stone-900">Bypasses Client Blockers</div>
          <p className="text-xs text-stone-500 leading-relaxed">
            Events dispatch from Next.js server runtime directly to Meta Graph API, unaffected by browser extensions, Brave Shields, or privacy firewalls.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-[11px] uppercase tracking-wider">
            <Zap className="h-4 w-4" />
            <span>Deduplication Algorithm</span>
          </div>
          <div className="text-base font-bold text-stone-900">Matching `event_id`</div>
          <p className="text-xs text-stone-500 leading-relaxed">
            When both the browser Pixel and server CAPI fire the same event with matching IDs, Meta automatically merges them into a single conversion.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-[11px] uppercase tracking-wider">
            <Lock className="h-4 w-4" />
            <span>Privacy Compliance</span>
          </div>
          <div className="text-base font-bold text-stone-900">SHA-256 Hashing</div>
          <p className="text-xs text-stone-500 leading-relaxed">
            All customer parameters (email, phone, name) are strictly hashed before leaving your secure server infrastructure.
          </p>
        </div>
      </div>

      {/* ── 5. Token Configuration Form ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold text-stone-900">Conversions API Dataset Access Token</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Navigate to Meta Events Manager &gt; Select Dataset &gt; Settings &gt; Conversions API &gt; &quot;Generate access token&quot;
            </p>
          </div>
          <div>
            {settings?.hasCapiAccessToken ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Configured ({settings.maskedCapiAccessToken})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                <span>Not Configured</span>
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveToken} className="space-y-4">
          {settings?.hasCapiAccessToken && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3 text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Active Token Stored in DB:</span>{" "}
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                    {settings.maskedCapiAccessToken}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700">Enter a new token below only to overwrite it.</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Dataset Access Token
              </label>
              {capiToken && (
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showToken ? "Hide text" : "Show text"}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
                placeholder={
                  settings?.hasCapiAccessToken
                    ? `${settings.maskedCapiAccessToken} (Saved in database — paste new token to replace)`
                    : "EAAG... (Paste Meta Conversions API Access Token)"
                }
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-mono text-stone-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition shadow-2xs pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                title={showToken ? "Hide token" : "Reveal token"}
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Token must start with <code className="font-mono text-stone-600 font-bold">EAA</code> from Meta Events Manager. Secrets are securely encrypted in MongoDB.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!capiToken && !settings?.hasCapiAccessToken)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying with Meta Graph API...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>Test CAPI Connection Live</span>
                  </>
                )}
              </button>

              {settings?.hasCapiAccessToken && (
                <button
                  type="button"
                  onClick={handleClearToken}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Token</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !capiToken.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save CAPI Access Token</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── 6. Server Payload Schema Preview ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Meta Graph API POST Endpoint &amp; Payload Schema (v22.0)
            </h3>
          </div>
          <button
            type="button"
            onClick={copyPayload}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            {copiedPayload ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedPayload ? "Copied!" : "Copy Payload Schema"}</span>
          </button>
        </div>

        <div className="p-4 bg-stone-900 font-mono text-xs overflow-x-auto text-stone-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="text-stone-400 mb-2 text-[11px]">
            POST https://graph.facebook.com/v22.0/{pixelId}/events
          </div>
          <pre className="text-emerald-400" suppressHydrationWarning>
            {JSON.stringify(sampleCapiPayload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
