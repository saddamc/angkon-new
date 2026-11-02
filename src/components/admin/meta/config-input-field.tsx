"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Pencil,
  Save,
  X,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { InfoPopover } from "./info-popover";

export type ConfigInputState =
  | "unsaved"
  | "saved_verified"
  | "saved_unverified"
  | "failed_expired";

export interface ConfigInputFieldProps {
  id?: string;
  label: string;
  description?: string;
  metricKey?: string;
  value: string;
  placeholder?: string;
  status: ConfigInputState;
  statusMessage?: string;
  isSensitive?: boolean;
  verifiedLabel?: string;
  unverifiedLabel?: string;
  failedLabel?: string;
  onSave?: (newValue: string) => Promise<boolean | void> | void;
  onVerify?: () => Promise<void> | void;
  onReplace?: () => void;
  validate?: (value: string) => string | null;
  locateAction?: {
    label: string;
    onClick: () => void;
  };
  disabled?: boolean;
  className?: string;
}

export function ConfigInputField({
  id,
  label,
  description,
  metricKey,
  value,
  placeholder = "",
  status,
  statusMessage,
  isSensitive = false,
  verifiedLabel = "Saved & Verified",
  unverifiedLabel = "Saved (Awaiting Verification)",
  failedLabel = "Connection Failed / Expired",
  onSave,
  onVerify,
  onReplace,
  validate,
  locateAction,
  disabled = false,
  className = "",
}: ConfigInputFieldProps) {
  const [isEditing, setIsEditing] = useState(status === "unsaved");
  const [draftValue, setDraftValue] = useState(value);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync draft value if parent prop updates when not editing
  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [value, isEditing]);

  // Keep unsaved state synchronized
  useEffect(() => {
    if (status === "unsaved") {
      setIsEditing(true);
    }
  }, [status]);

  const handleStartEdit = () => {
    setDraftValue(value);
    setValidationError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftValue(value);
    setValidationError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (validate) {
      const err = validate(draftValue);
      if (err) {
        setValidationError(err);
        return;
      }
    }
    setValidationError(null);
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(draftValue.trim());
      }
      setIsEditing(false);
    } catch {
      // Error handled by parent or local feedback
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!onVerify) return;
    setIsVerifying(true);
    try {
      await onVerify();
    } finally {
      setIsVerifying(false);
    }
  };

  // Mask sensitive values (e.g. tokens): EAAG...••••••••
  const maskedDisplayValue = isSensitive
    ? value
      ? `${value.slice(0, 6)}••••••••••••••••••••${value.slice(-4)}`
      : "••••••••••••••••••••••••"
    : value;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
        status === "saved_verified"
          ? "border-emerald-200 bg-white"
          : status === "saved_unverified"
          ? "border-amber-200 bg-amber-50/20"
          : status === "failed_expired"
          ? "border-rose-200 bg-rose-50/20"
          : "border-slate-200 bg-white"
      } ${className}`}
    >
      {/* ── 1. Field Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <label
            htmlFor={id}
            className="text-xs font-bold text-slate-900 tracking-tight"
          >
            {label}
          </label>

          {/* Contextual Help Icon */}
          {metricKey && (
            <InfoPopover metricKey={metricKey} iconSize="xs" />
          )}

          {/* State Badges */}
          {status === "saved_verified" && !isEditing && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-2.5 w-2.5" />
              <span>{verifiedLabel}</span>
            </span>
          )}

          {status === "saved_unverified" && !isEditing && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>{unverifiedLabel}</span>
            </span>
          )}

          {status === "failed_expired" && !isEditing && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
              <XCircle className="h-2.5 w-2.5" />
              <span>{failedLabel}</span>
            </span>
          )}

          {status === "unsaved" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
              <span>Unconfigured</span>
            </span>
          )}
        </div>

        {/* Optional Locate in Meta portal link */}
        {locateAction && (
          <button
            type="button"
            onClick={locateAction.onClick}
            className="text-[11px] font-semibold text-[#1877F2] hover:text-[#166FE5] hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>{locateAction.label}</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {description && (
        <p className="text-[11.5px] text-slate-500 mt-2 leading-relaxed">
          {description}
        </p>
      )}

      {/* ── 2. Input / Display Body ── */}
      <div className="mt-3">
        {/* State A: Editing Mode */}
        {isEditing && !isSensitive ? (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id={id}
                type="text"
                value={draftValue}
                onChange={(e) => {
                  setDraftValue(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder={placeholder}
                disabled={disabled || isSaving}
                className={`flex-1 h-10 px-3.5 rounded-xl border text-xs font-mono text-slate-900 focus:outline-none transition ${
                  validationError
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-1 focus:ring-rose-500"
                    : "border-slate-300 focus:border-[#1877F2] focus:ring-1 focus:ring-blue-500"
                }`}
              />

              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || disabled}
                  className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving ? "Saving..." : "Save"}</span>
                </button>

                {status !== "unsaved" && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>

            {validationError && (
              <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>
        ) : isSensitive ? (
          /* State B: Sensitive Token / Credential (Never view token; Replace Token only) */
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-xs text-slate-700 font-semibold truncate select-none">
                    {value ? maskedDisplayValue : "No token configured"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Encrypted at rest with AES-256-GCM. Plaintext is never exposed.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {onReplace && (
                  <button
                    type="button"
                    onClick={onReplace}
                    className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{value ? "Replace Token" : "Configure Token"}</span>
                  </button>
                )}
                {onVerify && value && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isVerifying ? "animate-spin" : ""}`} />
                    <span>{isVerifying ? "Testing..." : "Verify Connection"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* State C: Read-Only Locked Field (Requires explicit Edit action) */
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center gap-2 min-w-0 px-1">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-800 truncate select-all">
                  {value || "Not configured"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                {onVerify && status !== "saved_verified" && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isVerifying ? "animate-spin" : ""}`} />
                    <span>Verify</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStartEdit}
                  disabled={disabled}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="h-3 w-3 text-slate-500" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Feedback Message */}
        {statusMessage && (
          <div
            className={`mt-2 p-2 rounded-xl text-[11px] leading-relaxed flex items-start gap-1.5 ${
              status === "saved_verified"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                : status === "saved_unverified"
                ? "bg-amber-50 text-amber-800 border border-amber-100"
                : status === "failed_expired"
                ? "bg-rose-50 text-rose-800 border border-rose-100"
                : "bg-slate-50 text-slate-600 border border-slate-100"
            }`}
          >
            {status === "saved_verified" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            ) : status === "saved_unverified" ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            ) : status === "failed_expired" ? (
              <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
