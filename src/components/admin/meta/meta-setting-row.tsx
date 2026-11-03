"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Pencil, Plus } from "lucide-react";

/**
 * Settings section shell + read-only value rows.
 *
 * Settings are *read-only by default*: each row shows the saved value with a
 * confirmation check and an Edit (or Add) affordance. The editable form only
 * appears after an explicit Edit, and is dismissed with Cancel or committed
 * with Save. This keeps a configuration page scannable and prevents accidental
 * edits — the pattern used by Stripe, Vercel and Linear.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Value row
 * ────────────────────────────────────────────────────────────────────────── */

export interface MetaSettingRowProps {
  label: string;
  /** Rendered when `isSet` is true. */
  value?: ReactNode;
  isSet: boolean;
  /** Monospaced value, for IDs and keys. */
  mono?: boolean;
  /** Masked credential — value is shown as stored, never editable inline. */
  secret?: boolean;
  /** Overrides the action label (e.g. "Replace" for secrets). */
  actionLabel?: string;
  /** Row-level action; defaults to entering the section's edit mode. */
  onAction?: () => void;
  /** Hides the action button (row is informational only). */
  readOnly?: boolean;
  /** Value is derived by the system, not entered by the operator. */
  auto?: boolean;
}

export function MetaSettingRow({
  label,
  value,
  isSet,
  mono = false,
  secret = false,
  actionLabel,
  onAction,
  readOnly = false,
  auto = false,
}: MetaSettingRowProps) {
  const resolvedAction = actionLabel
    ? (!isSet && actionLabel === "Replace" ? (secret ? "Configure" : "Add") : actionLabel)
    : (isSet ? (secret ? "Replace" : "Edit") : (secret ? "Configure" : "Add"));

  return (
    <div className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:w-56 sm:shrink-0">
        <p className="text-[12.5px] font-medium leading-snug text-slate-600">
          {label}:
          {auto && (
            <span
              className="ml-1.5 rounded bg-slate-100 px-1 py-px align-[1px] text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-500"
              title="Set automatically by the system"
            >
              Auto
            </span>
          )}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:justify-end">
        <div className="flex min-w-0 items-center gap-2">
          {isSet ? (
            <>
              <span
                className={`truncate text-[12.5px] font-medium text-slate-900 ${
                  mono ? "font-mono" : ""
                } ${secret ? "tracking-[0.12em] text-slate-500" : ""}`}
              >
                {value}
              </span>
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                aria-label="Configured"
              />
            </>
          ) : (
            <span className="truncate text-[12.5px] italic text-slate-400">Not configured</span>
          )}
        </div>

        {!readOnly && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-[11.5px] font-semibold text-[#1877F2] transition hover:border-[#1877F2]/20 hover:bg-[#1877F2]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]/40"
          >
            {isSet ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {resolvedAction}
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Section shell
 * ────────────────────────────────────────────────────────────────────────── */

export interface MetaSettingsSectionProps {
  /** Displayed as "SECTION 01". */
  index: number;
  title: string;
  description: string;
  icon: ReactNode;
  /** Tailwind classes for the icon tile, e.g. "bg-blue-50 text-blue-600 border-blue-200/60". */
  accent: string;
  /** Status pill rendered in the header. */
  status?: ReactNode;
  rows: MetaSettingRowProps[];
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  /** Set false for read-only sections that only expose row-level actions. */
  canEdit?: boolean;
  /** Cancel + Save buttons, rendered in the footer while editing. */
  footer: ReactNode;
  /** Editable form; only rendered while `editing` is true. */
  children?: ReactNode;
  /** Diagnostics / secondary panels shown in both read and edit mode. */
  belowContent?: ReactNode;
  /** Extra header content (rare). */
  headerExtra?: ReactNode;
}

export function MetaSettingsSection({
  index,
  title,
  description,
  icon,
  accent,
  status,
  rows,
  editing,
  onEdit,
  onCancel,
  canEdit = true,
  footer,
  children,
  belowContent,
  headerExtra,
}: MetaSettingsSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accent}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Section {String(index).padStart(2, "0")}
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-[-0.005em] text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start">
          {headerExtra}
          {status}
          {canEdit && (!editing ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              Cancel
            </button>
          ))}
        </div>
      </header>

      {/* Body: read-only rows, or the editable form */}
      {editing ? (
        <div className="space-y-4 px-5 py-4">{children}</div>
      ) : (
        <div className="divide-y divide-slate-100 px-5">
          {rows.map((row) => (
            <MetaSettingRow key={row.label} {...row} />
          ))}
        </div>
      )}

      {/* Footer actions (edit mode only) */}
      {belowContent && <div className="border-t border-slate-100 px-5 py-4">{belowContent}</div>}

      {editing && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          {footer}
        </footer>
      )}
    </section>
  );
}
