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
  HelpCircle,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Eye,
  EyeOff,
  AlertCircle,
  History,
} from "lucide-react";

// ── Reusable Modal Base Shell ─────────────────────────────────────────
export interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /**
   * The value currently saved for this setting. Rendered as a "Current value"
   * strip so the operator can confirm exactly what they are about to replace —
   * omitted entirely when empty, so "Add" flows stay clean.
   */
  currentValue?: string;
  /** Label above the strip. Defaults to "Current value". */
  currentLabel?: string;
  children: React.ReactNode;
}

export function ModalBase({
  isOpen,
  onClose,
  title,
  subtitle,
  currentValue,
  currentLabel = "Current value",
  children,
}: ModalBaseProps) {
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

        {/* Saved value being replaced — confirms "old" before the operator overwrites it */}
        {currentValue && (
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {currentLabel}
              </p>
              <p className="mt-0.5 break-all text-xs font-medium leading-relaxed text-slate-700">
                {currentValue}
              </p>
            </div>
          </div>
        )}

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
      currentValue={currentPixelId}
      currentLabel="Current Dataset / Pixel ID"
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
  /** Masked form of the stored token, shown so the operator knows which credential is being replaced. */
  currentMasked?: string;
  onSaveToken: (token: string) => Promise<boolean | void>;
  onRequestRemoveToken: () => void;
  onOpenLocator?: () => void;
}

export function ConfigureCapiTokenModal({
  isOpen,
  onClose,
  hasExistingToken,
  currentMasked,
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
      currentValue={hasExistingToken ? currentMasked : undefined}
      currentLabel="Current CAPI token"
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
      currentValue={currentCode}
      currentLabel="Current Test Event Code"
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
      currentValue={currentAccountId}
      currentLabel="Current Ad Account ID"
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

// ── 7. Replace Marketing Token Modal ─────────────────────────────────
export interface ReplaceMarketingTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  adAccountId: string;
  /** Masked form of the stored token, shown so the operator knows which credential is being replaced. */
  currentMasked?: string;
  onSaveToken: (newToken: string) => Promise<boolean | void>;
  onOpenLocator?: (assetId: string) => void;
}

export function ReplaceMarketingTokenModal({
  isOpen,
  onClose,
  adAccountId,
  currentMasked,
  onSaveToken,
  onOpenLocator,
}: ReplaceMarketingTokenModalProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken("");
    setError(null);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      setError("Please enter a new Marketing API access token.");
      return;
    }
    if (cleanToken.length < 20) {
      setError("Invalid token: token must be at least 20 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveToken(cleanToken);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify and update token.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Replace Marketing API Access Token"
      subtitle="Enter a new System User access token with ads_read permission. It will be verified via Meta Graph API v22.0 and encrypted at rest using AES-256-GCM."
      currentValue={currentMasked}
      currentLabel="Current Marketing API token"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Target Ad Account</span>
          <span className="font-mono font-bold text-slate-800">{adAccountId || "act_1646756900434912"}</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-800">
              New Marketing API Token
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
            placeholder="EAAG..."
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

        {onOpenLocator && (
          <div className="text-xs">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLocator("marketing_token");
              }}
              className="text-[#1877F2] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Key className="h-3 w-3" />
              <span>How to generate a System User Token in Meta Business Suite ↗</span>
            </button>
          </div>
        )}

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
                <span>Verifying Token...</span>
              </>
            ) : (
              <span>Validate &amp; Save Token</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 8. Update Business ID Modal ──────────────────────────────────────
export interface UpdateBusinessIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBusinessId: string;
  currentBusinessName: string;
  onSaveBusiness: (businessId: string, businessName: string) => Promise<boolean | void>;
}

export function UpdateBusinessIdModal({
  isOpen,
  onClose,
  currentBusinessId,
  currentBusinessName,
  onSaveBusiness,
}: UpdateBusinessIdModalProps) {
  const [businessId, setBusinessId] = useState(currentBusinessId);
  const [businessName, setBusinessName] = useState(currentBusinessName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBusinessId(currentBusinessId);
    setBusinessName(currentBusinessName);
    setError(null);
  }, [currentBusinessId, currentBusinessName, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = businessId.trim();
    const cleanName = businessName.trim();
    if (!cleanId) {
      setError("Meta Business ID is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveBusiness(cleanId, cleanName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update business ID.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Update Meta Business Portfolio ID"
      subtitle="Configure your Meta Business Manager Portfolio ID and verified brand entity name."
      currentValue={
        [currentBusinessName, currentBusinessId].filter(Boolean).join("  ·  ") || undefined
      }
      currentLabel="Current business portfolio"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Business Portfolio Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Plain Stitch Business Portfolio"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Meta Business Manager ID
          </label>
          <input
            type="text"
            value={businessId}
            onChange={(e) => {
              setBusinessId(e.target.value);
              setError(null);
            }}
            placeholder="1646756900434912"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

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
              <span>Save Business ID</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 9. Update Attribution Config Modal ───────────────────────────────
export interface UpdateAttributionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWindows: string[];
  currentReportTime: "conversion" | "impression";
  onSaveConfig: (windows: string[], reportTime: "conversion" | "impression") => Promise<boolean | void>;
}

export function UpdateAttributionConfigModal({
  isOpen,
  onClose,
  currentWindows,
  currentReportTime,
  onSaveConfig,
}: UpdateAttributionConfigModalProps) {
  const [windows, setWindows] = useState<string[]>(currentWindows);
  const [reportTime, setReportTime] = useState<"conversion" | "impression">(currentReportTime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWindows(currentWindows);
    setReportTime(currentReportTime);
    setError(null);
  }, [currentWindows, currentReportTime, isOpen]);

  const toggleWindow = (win: string) => {
    setWindows((prev) =>
      prev.includes(win) ? prev.filter((w) => w !== win) : [...prev, win]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (windows.length === 0) {
      setError("Please select at least one attribution window.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveConfig(windows, reportTime);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update attribution configuration.");
    } finally {
      setSaving(false);
    }
  };

  const availableWindows = [
    { id: "7d_click", label: "7-Day Click", desc: "Conversions within 7 days of ad click (Industry Standard)" },
    { id: "1d_view", label: "1-Day View", desc: "Conversions within 24 hours of ad impression" },
    { id: "1d_click", label: "1-Day Click", desc: "Strict immediate 24-hour click window" },
    { id: "28d_click", label: "28-Day Click", desc: "Extended consideration cycle window" },
  ];

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Update Meta Attribution Configuration"
      subtitle="Configure conversion attribution windows and timestamp basis for ROAS and purchase metrics."
      currentValue={`${currentWindows.join(", ")}  ·  Report on ${currentReportTime}`}
      currentLabel="Current attribution config"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-800 mb-2 block">
            Attribution Windows (Select all that apply)
          </label>
          <div className="space-y-2">
            {availableWindows.map((win) => {
              const isSelected = windows.includes(win.id);
              return (
                <label
                  key={win.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    isSelected ? "bg-blue-50/60 border-blue-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleWindow(win.id)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{win.label}</span>
                    <span className="text-[11px] text-slate-500">{win.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-2 block">
            Action Report Time
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label
              className={`p-3 rounded-xl border cursor-pointer transition ${
                reportTime === "conversion" ? "bg-blue-50 border-blue-200 font-bold text-blue-900" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="actionReportTime"
                value="conversion"
                checked={reportTime === "conversion"}
                onChange={() => setReportTime("conversion")}
                className="sr-only"
              />
              <span className="block mb-0.5 font-bold">Conversion Time</span>
              <span className="text-[10px] text-slate-500 font-normal">Attributed on date purchase occurred</span>
            </label>
            <label
              className={`p-3 rounded-xl border cursor-pointer transition ${
                reportTime === "impression" ? "bg-blue-50 border-blue-200 font-bold text-blue-900" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="actionReportTime"
                value="impression"
                checked={reportTime === "impression"}
                onChange={() => setReportTime("impression")}
                className="sr-only"
              />
              <span className="block mb-0.5 font-bold">Impression Time</span>
              <span className="text-[10px] text-slate-500 font-normal">Attributed on date ad was shown</span>
            </label>
          </div>
        </div>

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
              <span>Save Attribution Configuration</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 11. Edit Catalog ID Modal ──────────────────────────────────────────────
export interface EditCatalogIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCatalogId: string;
  onSave: (newCatalogId: string) => Promise<boolean | void>;
  onOpenLocator?: () => void;
}

export function EditCatalogIdModal({
  isOpen,
  onClose,
  currentCatalogId,
  onSave,
  onOpenLocator,
}: EditCatalogIdModalProps) {
  const [catalogId, setCatalogId] = useState(currentCatalogId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCatalogId(currentCatalogId);
      setError(null);
      setSaving(false);
    }
  }, [isOpen, currentCatalogId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = catalogId.trim();

    if (!trimmed) {
      setError("Catalog Dataset ID is required.");
      return;
    }
    if (!/^\d{14,18}$/.test(trimmed)) {
      setError("Please enter a valid 15–16 digit Meta Catalog ID.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save Catalog ID");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Meta Catalog Dataset ID"
      subtitle="Connect your Meta Commerce Manager catalog dataset for Dynamic Product Ads & Instagram Shopping."
      currentValue={currentCatalogId}
      currentLabel="Current Catalog Dataset ID"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-800">
              Catalog Dataset ID <span className="text-rose-500">*</span>
            </label>
            {onOpenLocator && (
              <button
                type="button"
                onClick={onOpenLocator}
                className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Locate in Meta</span>
              </button>
            )}
          </div>
          <input
            type="text"
            value={catalogId}
            onChange={(e) => {
              setCatalogId(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 1112170671558899"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            autoFocus
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            Found in Meta Commerce Manager → Catalog Settings → Catalog ID. Must be 15–16 digits.
          </p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 space-y-1.5 text-xs text-purple-950">
          <div className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
            <span>Storefront Feed Integration</span>
          </div>
          <p className="text-[11px] text-purple-900/80 leading-relaxed">
            Changing this ID rebinds all 16 saree and apparel items to this Commerce Manager catalog dataset.
          </p>
        </div>

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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Catalog ID</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 12. Configure Catalog Token Modal ──────────────────────────────────────
export interface ConfigureCatalogTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingToken?: boolean;
  /** Masked form of the stored token, shown so the operator knows which credential is being replaced. */
  currentMasked?: string;
  onSaveToken: (token: string) => Promise<boolean | void>;
  onRequestRemoveToken?: () => Promise<boolean | void>;
  onOpenLocator?: () => void;
}

export function ConfigureCatalogTokenModal({
  isOpen,
  onClose,
  hasExistingToken = false,
  currentMasked,
  onSaveToken,
  onRequestRemoveToken,
  onOpenLocator,
}: ConfigureCatalogTokenModalProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setToken("");
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();

    if (!trimmed) {
      setError("Please paste a valid Meta Catalog API token.");
      return;
    }
    if (!trimmed.startsWith("EAA")) {
      setError("Meta System User tokens typically start with 'EAA'.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSaveToken(trimmed);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to encrypt and store Catalog API token.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={hasExistingToken ? "Replace Meta Catalog API Token" : "Connect Meta Catalog API Token"}
      subtitle="Encrypted at rest with AES-256-GCM. Requires 'catalog_management' permission on your Meta App."
      currentValue={hasExistingToken ? currentMasked : undefined}
      currentLabel="Current Catalog API token"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-800">
              System User Access Token <span className="text-rose-500">*</span>
            </label>
            {onOpenLocator && (
              <button
                type="button"
                onClick={onOpenLocator}
                className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Locate in Business Manager</span>
              </button>
            )}
          </div>
          <input
            type="password"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (error) setError(null);
            }}
            placeholder="EAAG..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            autoFocus
          />
          {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-1 text-xs text-emerald-950">
          <div className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Vault Encryption Guarantee</span>
          </div>
          <p className="text-[11px] text-emerald-900/80 leading-relaxed">
            Your token is encrypted using AES-256-GCM with a server-side vault key. It is never logged or exposed in client payloads.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {hasExistingToken && onRequestRemoveToken ? (
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  await onRequestRemoveToken();
                  onClose();
                } catch {
                  setError("Failed to disconnect token.");
                } finally {
                  setSaving(false);
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Disconnect Token
            </button>
          ) : <div />}

          <div className="flex items-center gap-2.5">
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Encrypting...</span>
                </>
              ) : (
                <span>Save Encrypted Token</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 13. Configure Feed Schedule Modal ──────────────────────────────────────
export interface ConfigureFeedScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchedule?: string;
  currentFeedName?: string;
  onSaveSchedule: (config: { schedule: string; feedName: string; hour: number }) => Promise<boolean | void>;
}

export function ConfigureFeedScheduleModal({
  isOpen,
  onClose,
  currentSchedule = "DAILY",
  currentFeedName = "ANGKON Production Catalog Feed",
  onSaveSchedule,
}: ConfigureFeedScheduleModalProps) {
  const [schedule, setSchedule] = useState(currentSchedule);
  const [feedName, setFeedName] = useState(currentFeedName);
  const [hour, setHour] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSchedule(currentSchedule);
      setFeedName(currentFeedName);
      setSaving(false);
    }
  }, [isOpen, currentSchedule, currentFeedName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSchedule({
        schedule,
        feedName: feedName.trim() || "ANGKON Production Catalog Feed",
        hour,
      });
      onClose();
    } catch {
      // error handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Catalog Feed Schedule"
      subtitle="Set automated crawl frequency and registration metadata for Meta Commerce Manager scheduled fetch."
      currentValue={`${currentSchedule} · ${currentFeedName}`}
      currentLabel="Current feed schedule"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Feed Display Name
          </label>
          <input
            type="text"
            value={feedName}
            onChange={(e) => setFeedName(e.target.value)}
            placeholder="ANGKON Production Catalog Feed"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-2 block">
            Crawl Frequency
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                schedule === "DAILY"
                  ? "bg-purple-50 border-purple-300 ring-2 ring-purple-100"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="schedule"
                value="DAILY"
                checked={schedule === "DAILY"}
                onChange={() => setSchedule("DAILY")}
                className="sr-only"
              />
              <span className="block text-xs font-bold text-slate-900 mb-0.5">Daily Crawl</span>
              <span className="text-[11px] text-slate-500">Every 24 hours at scheduled UTC time</span>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                schedule === "HOURLY"
                  ? "bg-purple-50 border-purple-300 ring-2 ring-purple-100"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="schedule"
                value="HOURLY"
                checked={schedule === "HOURLY"}
                onChange={() => setSchedule("HOURLY")}
                className="sr-only"
              />
              <span className="block text-xs font-bold text-slate-900 mb-0.5">Hourly Crawl</span>
              <span className="text-[11px] text-slate-500">Best for dynamic pricing & stock changes</span>
            </label>
          </div>
        </div>

        {schedule === "DAILY" && (
          <div>
            <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
              Scheduled Fetch Hour (UTC)
            </label>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value={4}>04:00 UTC (10:00 AM BD Time) - Default</option>
              <option value={0}>00:00 UTC (06:00 AM BD Time)</option>
              <option value={8}>08:00 UTC (02:00 PM BD Time)</option>
              <option value={12}>12:00 UTC (06:00 PM BD Time)</option>
            </select>
          </div>
        )}

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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Save Schedule Configuration</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 14. Add New Domain Modal ──────────────────────────────────────────
export interface AddDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDomain: (data: {
    domain: string;
    verificationMethod: "dns_txt" | "html_meta_tag";
    customToken?: string;
  }) => Promise<void>;
}

export function AddDomainModal({
  isOpen,
  onClose,
  onAddDomain,
}: AddDomainModalProps) {
  const [domainInput, setDomainInput] = useState("");
  const [method, setMethod] = useState<"dns_txt" | "html_meta_tag">("dns_txt");
  const [customToken, setCustomToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDomainInput("");
      setMethod("dns_txt");
      setCustomToken("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (!cleanDomain || !cleanDomain.includes(".")) {
      setError("Please enter a valid domain name (e.g. angkon.com or store.angkon.net).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAddDomain({
        domain: cleanDomain,
        verificationMethod: method,
        customToken: customToken.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register domain.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Domain"
      subtitle="Register an additional root domain or subdomain to the ANGKON store portfolio."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Domain Name
          </label>
          <input
            type="text"
            required
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="e.g. angkon.com or boutique.angkon.net"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Enter the root domain or subdomain without http:// or www.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Verification Method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              className={`p-3 rounded-xl border cursor-pointer transition ${
                method === "dns_txt"
                  ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="method"
                value="dns_txt"
                checked={method === "dns_txt"}
                onChange={() => setMethod("dns_txt")}
                className="sr-only"
              />
              <span className="block text-xs font-bold text-slate-900 mb-0.5">DNS TXT Record</span>
              <span className="text-[11px] text-slate-500">Recommended for apex domains on Namecheap</span>
            </label>

            <label
              className={`p-3 rounded-xl border cursor-pointer transition ${
                method === "html_meta_tag"
                  ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="method"
                value="html_meta_tag"
                checked={method === "html_meta_tag"}
                onChange={() => setMethod("html_meta_tag")}
                className="sr-only"
              />
              <span className="block text-xs font-bold text-slate-900 mb-0.5">HTML Meta Tag</span>
              <span className="text-[11px] text-slate-500">Injected into root storefront &lt;head&gt;</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Meta Verification Token (Optional)
          </label>
          <input
            type="text"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
            placeholder="e.g. c82us1ogm8zgy1u7zn8v7dcvzpt1a2"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Leave blank to auto-generate a secure 30-character lowercase token.
          </p>
        </div>

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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <span>Register Domain</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 15. Configure Domain Verification Token Modal ──────────────────────
export interface ConfigureDomainTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  currentToken?: string;
  currentMethod?: "dns_txt" | "html_meta_tag";
  onSaveToken: (data: {
    token: string;
    method: "dns_txt" | "html_meta_tag";
  }) => Promise<void>;
}

export function ConfigureDomainTokenModal({
  isOpen,
  onClose,
  domain,
  currentToken = "",
  currentMethod = "dns_txt",
  onSaveToken,
}: ConfigureDomainTokenModalProps) {
  const [tokenInput, setTokenInput] = useState(currentToken);
  const [method, setMethod] = useState<"dns_txt" | "html_meta_tag">(currentMethod);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTokenInput(currentToken);
      setMethod(currentMethod);
      setError(null);
    }
  }, [isOpen, currentToken, currentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken || cleanToken.length < 10) {
      setError("Please provide a valid Meta Domain Verification token (typically 30 characters).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveToken({ token: cleanToken, method });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update domain token.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Domain Verification Token"
      subtitle={`Configure or replace the verification token for ${domain}.`}
      currentValue={currentToken || undefined}
      currentLabel="Current verification token"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600">
            <span>Target Domain:</span>
            <strong className="font-mono text-slate-900">{domain}</strong>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>DNS Apex Authority:</span>
            <span className="font-medium text-slate-800">Namecheap DNS</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Verification Method
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label
              className={`p-3 rounded-xl border cursor-pointer transition ${
                method === "dns_txt"
                  ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="configMethod"
                value="dns_txt"
                checked={method === "dns_txt"}
                onChange={() => setMethod("dns_txt")}
                className="sr-only"
              />
              <span className="block text-xs font-bold text-slate-900 mb-0.5">DNS TXT Record</span>
              <span className="text-[11px] text-slate-500">Host @ TXT Record</span>
            </label>

            <label
              className={`p-3 rounded-xl border cursor-pointer transition ${
                method === "html_meta_tag"
                  ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="configMethod"
                value="html_meta_tag"
                checked={method === "html_meta_tag"}
                onChange={() => setMethod("html_meta_tag")}
                className="sr-only"
              />
              <span className="block text-xs font-bold text-slate-900 mb-0.5">HTML Meta Tag</span>
              <span className="text-[11px] text-slate-500">Next.js Head Injection</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Meta Verification Token
          </label>
          <input
            type="text"
            required
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="e.g. c82us1ogm8zgy1u7zn8v7dcvzpt1a2"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Obtained from Meta Business Manager &gt; Brand Safety &gt; Domains.
          </p>
        </div>

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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Token</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 16. Configure AEM Priority Modal ──────────────────────────────────
export interface ConfigureAemPriorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePriority?: (events: string[]) => Promise<void>;
}

export function ConfigureAemPriorityModal({
  isOpen,
  onClose,
  onSavePriority,
}: ConfigureAemPriorityModalProps) {
  const [events, setEvents] = useState([
    "Purchase",
    "InitiateCheckout",
    "AddToCart",
    "ViewContent",
    "PageView",
  ]);
  const [saving, setSaving] = useState(false);

  const moveUp = (index: number) => {
    if (index === 0) return;
    setEvents((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === events.length - 1) return;
    setEvents((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSavePriority) {
        await onSavePriority(events);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Aggregated Event Measurement (AEM) Priority"
      subtitle="Arrange the 5 core e-commerce events in order of bidding priority for iOS 14.5+ users."
    >
      <div className="space-y-4 pt-1 text-xs">
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>Meta Graph API v22.0 Architectural Disclosure</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-900">
            Meta does not expose an external programmatic REST API endpoint to mutate AEM event priority. Saving here updates your ANGKON store calibration policy. You must mirror this priority order in Meta Events Manager &gt; Aggregated Event Measurement.
          </p>
        </div>

        <div className="space-y-2">
          {events.map((eventName, idx) => (
            <div
              key={eventName}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-6 w-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                  #{idx + 1}
                </span>
                <div>
                  <span className="font-bold text-slate-900 text-xs">{eventName}</span>
                  <div className="text-[10px] text-slate-500">
                    {idx === 0
                      ? "Value Optimization (ROAS)"
                      : idx === 1
                      ? "Funnel Progression"
                      : idx === 2
                      ? "Cart Remarketing"
                      : idx === 3
                      ? "Dynamic Retargeting"
                      : "General Traffic"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveUp(idx)}
                  className="p-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-slate-600" />
                </button>
                <button
                  type="button"
                  disabled={idx === events.length - 1}
                  onClick={() => moveDown(idx)}
                  className="p-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-slate-600" />
                </button>
              </div>
            </div>
          ))}

          {/* Slots 6-8 Available Indicators */}
          {[6, 7, 8].map((s) => (
            <div
              key={s}
              className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-6 w-6 rounded-lg bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                  #{s}
                </span>
                <span className="text-xs font-medium">Slot #{s} — Unassigned (Available)</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Reserved</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Store Calibration"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

// ── 13. Configure Meta App Secret Modal ────────────────────────────────
export interface ConfigureAppSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingSecret: boolean;
  /** Masked form of the stored secret, shown so the operator knows which credential is being replaced. */
  currentMasked?: string;
  onSaveSecret: (appSecret: string) => Promise<boolean | void>;
  onRequestRemoveSecret?: () => void;
  onOpenLocator?: () => void;
}

export function ConfigureAppSecretModal({
  isOpen,
  onClose,
  hasExistingSecret,
  currentMasked,
  onSaveSecret,
  onRequestRemoveSecret,
  onOpenLocator,
}: ConfigureAppSecretModalProps) {
  const [appSecret, setAppSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAppSecret("");
    setError(null);
    setShowSecret(false);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = appSecret.trim();
    if (!clean) {
      setError("Meta App Secret is required.");
      return;
    }
    if (clean.startsWith("EAA")) {
      setError(
        "This looks like an Access Token (starts with EAA). The Meta App Secret is a 32-character hexadecimal key found under App settings > Basic in Meta for Developers."
      );
      return;
    }
    if (clean.length < 16) {
      setError("Meta App Secret must be a valid key (typically 32 hexadecimal characters).");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSaveSecret(clean);
      onClose();
    } catch {
      setError("Failed to encrypt and save Meta App Secret. Please check server logs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={hasExistingSecret ? "Replace Meta App Secret" : "Configure Meta App Secret"}
      subtitle="Used to generate HMAC-SHA256 appsecret_proof for server-to-server Meta Graph API payloads and incoming webhook verification."
      currentValue={hasExistingSecret ? currentMasked : undefined}
      currentLabel="Current App Secret"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* AES-256 Vault Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/70 border border-purple-200/60 text-purple-900 text-xs">
          <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Cryptographic Vault Protection:</span> Stored encrypted at rest using{" "}
            <strong>AES-256-GCM</strong> authenticated encryption. Plaintext is never exposed in browser payloads.
          </div>
        </div>

        {/* Input Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-800">
              Meta App Secret (32-Character Hexadecimal)
            </label>
            {hasExistingSecret && (
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Existing Secret Encrypted</span>
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={appSecret}
              onChange={(e) => {
                setAppSecret(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 7f9a1c8b3e2d4f5a6b7c8d9e0f1a2b3c"
              className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] transition shadow-2xs"
              autoComplete="off"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              title={showSecret ? "Hide secret" : "Show secret"}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            Locate in: <strong>Meta for Developers &gt; My Apps &gt; [Your App] &gt; App settings &gt; Basic &gt; App Secret</strong> (click Show).
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {hasExistingSecret && onRequestRemoveSecret && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestRemoveSecret();
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Remove Secret
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !appSecret.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Encrypting &amp; Saving...</span>
                </>
              ) : (
                <span>{hasExistingSecret ? "Save New Secret" : "Save App Secret"}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 17. Edit Meta App ID Modal ──────────────────────────────────────────────
export interface EditAppIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAppId: string;
  onSaveAppId: (appId: string) => Promise<boolean | void>;
}

export function EditAppIdModal({
  isOpen,
  onClose,
  currentAppId,
  onSaveAppId,
}: EditAppIdModalProps) {
  const [appId, setAppId] = useState(currentAppId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAppId(currentAppId);
    setError(null);
  }, [currentAppId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = appId.trim();
    if (!clean) {
      setError("Meta App ID is required.");
      return;
    }
    if (!/^\d{5,20}$/.test(clean)) {
      setError("Meta App ID is a numeric identifier (typically 15 digits).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveAppId(clean);
      onClose();
    } catch {
      setError("Failed to save Meta App ID. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Update Meta App ID"
      subtitle="The App ID identifies your application in Meta for Developers. It pairs with the App Secret to sign server-to-server Graph API requests."
      currentValue={currentAppId || undefined}
      currentLabel="Current Meta App ID"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-800 mb-1.5 block">
            Meta App ID (Numeric)
          </label>
          <input
            type="text"
            value={appId}
            onChange={(e) => {
              setAppId(e.target.value);
              setError(null);
            }}
            placeholder="104938271649281"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !appId.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save App ID</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

// ── 18. Edit Tracking Signals Modal ─────────────────────────────────────────
export interface TrackingSignalState {
  enabled: boolean;
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
}

export interface EditTrackingSignalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  current: TrackingSignalState;
  onSaveSignals: (next: TrackingSignalState) => Promise<boolean | void>;
}

const TRACKING_SIGNAL_LABELS: Array<{
  key: Exclude<keyof TrackingSignalState, "enabled">;
  label: string;
  hint: string;
}> = [
  { key: "trackPageView", label: "PageView", hint: "Any storefront page load" },
  { key: "trackViewContent", label: "ViewContent", hint: "Product detail viewed" },
  { key: "trackAddToCart", label: "AddToCart", hint: "Item added to cart" },
  { key: "trackInitiateCheckout", label: "InitiateCheckout", hint: "Checkout started" },
  { key: "trackPurchase", label: "Purchase", hint: "Order completed" },
];

export function EditTrackingSignalsModal({
  isOpen,
  onClose,
  current,
  onSaveSignals,
}: EditTrackingSignalsModalProps) {
  const [next, setNext] = useState<TrackingSignalState>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNext(current);
    setError(null);
  }, [current, isOpen]);

  const activeCount = TRACKING_SIGNAL_LABELS.filter((s) => next[s.key]).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Disabling tracking turns every signal off — make that explicit rather
    // than silently persisting stale booleans in the payload.
    const payload: TrackingSignalState = next.enabled
      ? next
      : {
          enabled: false,
          trackPageView: false,
          trackViewContent: false,
          trackAddToCart: false,
          trackInitiateCheckout: false,
          trackPurchase: false,
        };

    if (payload.enabled && activeCount === 0) {
      setError("Enable at least one signal, or turn tracking off entirely.");
      return;
    }

    setSaving(true);
    try {
      await onSaveSignals(payload);
      onClose();
    } catch {
      setError("Failed to save tracking signals.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Tracking Signals"
      subtitle="Choose which storefront events are forwarded to your Meta Dataset. Every enabled signal is hashed with SHA-256 before dispatch."
      currentValue={`${activeCount} of 5 signals enabled · tracking ${
        current.enabled ? "on" : "off"
      }`}
      currentLabel="Current signal configuration"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 transition hover:bg-slate-100">
          <input
            type="checkbox"
            checked={next.enabled}
            onChange={(e) => setNext((s) => ({ ...s, enabled: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-slate-800">
              Browser &amp; server tracking
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
              Master switch for the Meta Pixel and Conversions API. Turning this off stops all
              event delivery.
            </span>
          </span>
        </label>

        <fieldset disabled={!next.enabled} className="space-y-2 disabled:opacity-50">
          <legend className="mb-1 text-xs font-semibold text-slate-800">
            Active e-commerce signals
          </legend>
          {TRACKING_SIGNAL_LABELS.map((signal) => (
            <label
              key={signal.key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={next[signal.key]}
                onChange={(e) => setNext((s) => ({ ...s, [signal.key]: e.target.checked }))}
                className="h-4 w-4 shrink-0 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-xs font-semibold text-slate-800">
                  {signal.label}
                </span>
                <span className="block text-[11px] text-slate-500">{signal.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
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
              <span>Save Signals</span>
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}



