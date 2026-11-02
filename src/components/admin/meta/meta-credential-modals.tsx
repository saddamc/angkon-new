"use client";

import { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  Key,
  ShieldCheck,
  Server,
  PlayCircle,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Globe,
  ShoppingBag,
} from "lucide-react";

// ── Reusable Modal Base Shell ─────────────────────────────────────────
export interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ModalBase({ isOpen, onClose, title, subtitle, children }: ModalBaseProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl border border-slate-200/90 max-w-lg w-full p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150 space-y-4 font-sans text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        {children}
      </div>
    </div>
  );
}

// ── 1. Edit Dataset / Pixel ID Modal ──────────────────────────────────
export interface EditDatasetIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPixelId: string;
  onSave: (newId: string) => Promise<boolean | void>;
  onOpenLocator?: () => void;
}

export function EditDatasetIdModal({
  isOpen,
  onClose,
  currentPixelId,
  onSave,
  onOpenLocator,
}: EditDatasetIdModalProps) {
  const [pixelId, setPixelId] = useState(currentPixelId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPixelId(currentPixelId);
    setError(null);
  }, [currentPixelId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pixelId.trim();
    if (!clean) {
      setError("Dataset / Pixel ID is required.");
      return;
    }
    if (!/^\d{12,20}$/.test(clean)) {
      setError("Dataset ID must be a 12–20 digit numeric identifier.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(clean);
      onClose();
    } catch {
      setError("Failed to save Dataset ID. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Meta Dataset / Pixel ID"
      subtitle="Connect storefront browser tracking and server Conversions API to your Meta Dataset."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Dataset / Pixel ID (Numeric)
          </label>
          <input
            type="text"
            value={pixelId}
            onChange={(e) => {
              setPixelId(e.target.value);
              setError(null);
            }}
            placeholder="1304551066085265"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            autoFocus
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

        {onOpenLocator && (
          <div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLocator();
              }}
              className="text-xs text-[#1877F2] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Where to find this in Meta Events Manager?</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Dataset ID</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 2. Configure Conversions API (CAPI) Token Modal ───────────────────
export interface ConfigureCapiTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingToken: boolean;
  onSaveToken: (token: string) => Promise<boolean | void>;
  onRequestRemoveToken: () => void;
  onOpenLocator?: () => void;
}

export function ConfigureCapiTokenModal({
  isOpen,
  onClose,
  hasExistingToken,
  onSaveToken,
  onRequestRemoveToken,
  onOpenLocator,
}: ConfigureCapiTokenModalProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken("");
    setError(null);
    setShowToken(false);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = token.trim();
    if (!clean) {
      setError("Conversions API access token is required.");
      return;
    }
    if (!clean.startsWith("EAAG") && !clean.startsWith("EAA")) {
      setError("Meta Graph API tokens typically begin with 'EAAG...' or 'EAA...'. Please check your token.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveToken(clean);
      onClose();
    } catch {
      setError("Failed to encrypt and save token.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Conversions API Access Token"
      subtitle="Encrypted with AES-256-GCM. Powers direct server-to-server CAPI delivery to Meta Graph API v22.0."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {hasExistingToken && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Active AES-256 Encrypted Token Saved</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestRemoveToken();
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
            >
              Remove Token
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-800">
              System User Access Token
            </label>
            <button
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
              className="text-[11px] text-[#1877F2] hover:underline font-semibold cursor-pointer"
            >
              {showToken ? "Hide characters" : "Show characters"}
            </button>
          </div>
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError(null);
            }}
            placeholder={hasExistingToken ? "•••••••••••••••••••• (Paste new token to replace)" : "EAAG..."}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            autoFocus
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

        {onOpenLocator && (
          <div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLocator();
              }}
              className="text-xs text-[#1877F2] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Where to generate this token in Meta?</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !token.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Encrypting & Saving...</span>
              </>
            ) : (
              <span>Save & Verify Token</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 3. Configure Test Event Code Modal ────────────────────────────────
export interface ConfigureTestCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  onSaveCode: (code: string) => Promise<boolean | void>;
  onOpenLocator?: () => void;
}

export function ConfigureTestCodeModal({
  isOpen,
  onClose,
  currentCode,
  onSaveCode,
  onOpenLocator,
}: ConfigureTestCodeModalProps) {
  const [code, setCode] = useState(currentCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCode(currentCode);
    setError(null);
  }, [currentCode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    setSaving(true);
    setError(null);
    try {
      await onSaveCode(clean);
      onClose();
    } catch {
      setError("Failed to save Test Event Code.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Meta Test Event Code"
      subtitle="Routes test conversion events directly into the 'Test events' tab in Meta Events Manager without polluting real ad reporting."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Test Event Code (e.g. TEST12345)
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="TEST12345"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs uppercase font-bold text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            autoFocus
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

        {onOpenLocator && (
          <div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLocator();
              }}
              className="text-xs text-[#1877F2] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Where to find this code in Events Manager?</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Test Code</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 4. Configure Ad Account & Marketing API Modal ────────────────────
export interface ConfigureAdAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccountId: string;
  hasExistingToken: boolean;
  onSaveCredentials: (accountId: string, token: string) => Promise<boolean | void>;
  onRequestDisconnect?: () => void;
  onOpenLocator?: (assetId: string) => void;
}

export function ConfigureAdAccountModal({
  isOpen,
  onClose,
  currentAccountId,
  hasExistingToken,
  onSaveCredentials,
  onRequestDisconnect,
  onOpenLocator,
}: ConfigureAdAccountModalProps) {
  const [accountId, setAccountId] = useState(currentAccountId);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAccountId(currentAccountId);
    setToken("");
    setError(null);
  }, [currentAccountId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAccount = accountId.trim();
    const cleanToken = token.trim();
    if (!cleanAccount) {
      setError("Meta Ad Account ID is required.");
      return;
    }
    if (!hasExistingToken && !cleanToken) {
      setError("Marketing API access token is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveCredentials(cleanAccount, cleanToken);
      onClose();
    } catch {
      setError("Failed to verify and connect Ad Account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Meta Ad Account Credentials"
      subtitle="Connect your Meta Ad Account ID and Marketing API token (with ads_read permission) to audit ROAS and spend."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {hasExistingToken && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Ad Account Connected</span>
            </div>
            {onRequestDisconnect && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestDisconnect();
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
              >
                Disconnect Account
              </button>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Ad Account ID (e.g. act_1646756900434978)
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setError(null);
            }}
            placeholder="act_1646756900434978"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-800">
              Marketing API System User Token (ads_read)
            </label>
            <button
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
              className="text-[11px] text-[#1877F2] hover:underline font-semibold cursor-pointer"
            >
              {showToken ? "Hide characters" : "Show characters"}
            </button>
          </div>
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError(null);
            }}
            placeholder={hasExistingToken ? "•••••••••••••••••••• (Leave blank to keep active token)" : "EAAG..."}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

        {onOpenLocator && (
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLocator("ad_account_id");
              }}
              className="text-[#1877F2] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Locate Ad Account ID ↗</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLocator("marketing_token");
              }}
              className="text-[#1877F2] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Generate System User Token ↗</span>
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Verifying & Connecting...</span>
              </>
            ) : (
              <span>Verify & Connect</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 5. Standardized Destructive Warning Confirmation Modal ───────────
export interface MetaConfirmWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmButtonText?: string;
  onConfirm: () => Promise<void> | void;
  isProcessing?: boolean;
}

export function MetaConfirmWarningModal({
  isOpen,
  onClose,
  title,
  description,
  confirmButtonText = "Remove & Disconnect",
  onConfirm,
  isProcessing = false,
}: MetaConfirmWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl border border-slate-200/90 max-w-md w-full p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150 space-y-4 font-sans text-slate-900">
        {/* Warning Icon & Header */}
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
          ⚠️ This action takes effect immediately and may disrupt live Meta advertising or conversion tracking signals.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <span>{confirmButtonText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 6. Connect Data Source Selection Modal ────────────────────────────
export interface ConnectDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (optionKey: "web" | "server" | "catalog" | "domain") => void;
}

export function ConnectDataSourceModal({
  isOpen,
  onClose,
  onSelectOption,
}: ConnectDataSourceModalProps) {
  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Connect a New Meta Data Source"
      subtitle="Select the tracking pipeline you want to link to ANGKON's Meta Business Suite."
    >
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            onClose();
            onSelectOption("web");
          }}
          className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer flex items-start gap-3.5 group shadow-2xs"
        >
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
              Web Browser Pixel SDK
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Real-time client-side tracking in visitor browsers. Captures storefront navigation, product page views, and cart actions.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onSelectOption("server");
          }}
          className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition cursor-pointer flex items-start gap-3.5 group shadow-2xs"
        >
          <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
              Server Conversions API (CAPI) Gateway
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Direct server-to-server dispatch with cryptographic deduplication, SHA-256 customer data, and ad-blocker recovery.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onSelectOption("catalog");
          }}
          className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer flex items-start gap-3.5 group shadow-2xs"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
              Dynamic Saree Catalog Feed (RSS 2.0 XML)
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Automated live inventory sync powering Advantage+ catalog ads, collection carousels, and Instagram Shopping tags.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onSelectOption("domain");
          }}
          className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition cursor-pointer flex items-start gap-3.5 group shadow-2xs"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition">
              Domain Verification & AEM Prioritization
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Verify angkon.net ownership and configure iOS 14.5+ 8-event conversion hierarchy for reliable delivery.
            </p>
          </div>
        </button>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </ModalBase>
  );
}

