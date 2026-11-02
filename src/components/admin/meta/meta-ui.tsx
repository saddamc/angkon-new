import type { ReactNode } from "react";

/**
 * Meta Marketing Suite design system.
 *
 * One source of truth for page structure, typography and colour so every
 * screen in `/admin/meta` reads as one product instead of five separate
 * pages. Tokens are deliberately restrained: a single neutral scale, one
 * accent (Meta blue), and semantic tones used only where they carry meaning.
 *
 * Presentational only — no hooks and no "use client" directive, so these can
 * be imported from server or client components alike.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Tokens
 * ────────────────────────────────────────────────────────────────────────── */

export const META_CARD =
  "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export const META_EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400";

export type MetaTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

const TONE_BADGE: Record<MetaTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  success: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200/70 bg-amber-50 text-amber-700",
  danger: "border-rose-200/70 bg-rose-50 text-rose-700",
  info: "border-blue-200/70 bg-blue-50 text-blue-700",
  brand: "border-[#1877F2]/25 bg-[#1877F2]/10 text-[#1877F2]",
};

const TONE_TEXT: Record<MetaTone, string> = {
  neutral: "text-slate-700",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  info: "text-blue-600",
  brand: "text-[#1877F2]",
};

const TONE_CALLOUT: Record<MetaTone, { root: string; label: string }> = {
  neutral: { root: "border-slate-200 bg-slate-50", label: "text-slate-500" },
  success: { root: "border-emerald-200/70 bg-emerald-50", label: "text-emerald-700" },
  warning: { root: "border-amber-200/70 bg-amber-50", label: "text-amber-800" },
  danger: { root: "border-rose-200/70 bg-rose-50", label: "text-rose-700" },
  info: { root: "border-blue-200/70 bg-blue-50", label: "text-blue-700" },
  brand: { root: "border-[#1877F2]/25 bg-[#1877F2]/[0.06]", label: "text-[#1877F2]" },
};

/** Numeric score → semantic tone. Shared by EMQ, health and coverage meters. */
export function scoreTone(score: number, scale = 10): MetaTone {
  const ratio = scale > 0 ? score / scale : 0;
  if (ratio >= 0.8) return "success";
  if (ratio >= 0.6) return "warning";
  return "danger";
}

export function scoreLabel(score: number, scale = 10): string {
  const ratio = scale > 0 ? score / scale : 0;
  if (ratio >= 0.8) return "Strong";
  if (ratio >= 0.6) return "Needs attention";
  return "Poor";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Page header
 * ────────────────────────────────────────────────────────────────────────── */

export interface MetaPageHeaderProps {
  /** Small uppercase line above the title. */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Primary/secondary buttons, right aligned on desktop. */
  actions?: ReactNode;
  /** Status pill rendered next to the title. */
  status?: ReactNode;
}

export function MetaPageHeader({
  eyebrow,
  title,
  description,
  actions,
  status,
}: MetaPageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className={`${META_EYEBROW} mb-1.5`}>{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-slate-900">
            {title}
          </h1>
          {status}
        </div>
        {description && (
          <div className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-slate-500">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Section card
 * ────────────────────────────────────────────────────────────────────────── */

export interface MetaSectionProps {
  title: string;
  description?: ReactNode;
  /** Controls rendered on the right of the section header. */
  actions?: ReactNode;
  /** Remove the default body padding (for full-bleed tables/charts). */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

export function MetaSection({
  title,
  description,
  actions,
  flush = false,
  className = "",
  children,
}: MetaSectionProps) {
  return (
    <section className={`${META_CARD} overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold leading-snug tracking-[-0.005em] text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : "px-4 py-4 sm:px-5 sm:py-5"}>{children}</div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Stat tile
 * ────────────────────────────────────────────────────────────────────────── */

export interface MetaStatProps {
  label: string;
  value: ReactNode;
  /** Muted supporting line under the value. */
  hint?: ReactNode;
  tone?: MetaTone;
  icon?: ReactNode;
  /** Optional trailing element (badge, link, sparkline). */
  meta?: ReactNode;
}

export function MetaStat({ label, value, hint, tone, icon, meta }: MetaStatProps) {
  return (
    <div className={`${META_CARD} flex flex-col gap-2 p-4`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium leading-snug text-slate-500">{label}</span>
        {meta ?? (icon && <span className="shrink-0 text-slate-300">{icon}</span>)}
      </div>
      <div
        className={`text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${
          tone ? TONE_TEXT[tone] : "text-slate-900"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[11.5px] leading-snug text-slate-400">{hint}</div>}
    </div>
  );
}

/** Simple responsive grid for `MetaStat` tiles. */
export function MetaStatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Badge / callout / empty state
 * ────────────────────────────────────────────────────────────────────────── */

export interface MetaBadgeProps {
  tone?: MetaTone;
  children: ReactNode;
  className?: string;
}

export function MetaBadge({ tone = "neutral", children, className = "" }: MetaBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 ${TONE_BADGE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export interface MetaCalloutProps {
  tone?: MetaTone;
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function MetaCallout({ tone = "neutral", title, children, icon, actions }: MetaCalloutProps) {
  const palette = TONE_CALLOUT[tone];
  return (
    <div className={`flex gap-3 rounded-lg border px-3.5 py-3 ${palette.root}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && (
          <p className={`text-[12.5px] font-semibold leading-snug ${palette.label}`}>{title}</p>
        )}
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600">{children}</div>
      </div>
      {actions && <div className="flex shrink-0 items-start gap-2">{actions}</div>}
    </div>
  );
}

export interface MetaEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function MetaEmptyState({ icon, title, description, action }: MetaEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-[13.5px] font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Detail rows (label / value pairs used by settings & diagnostics panels)
 * ────────────────────────────────────────────────────────────────────────── */

export interface MetaDetailRow {
  label: string;
  value: ReactNode;
}

export function MetaDetails({ rows, className = "" }: { rows: MetaDetailRow[]; className?: string }) {
  return (
    <dl className={`divide-y divide-slate-100 ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-[12px] text-slate-500">{row.label}</dt>
          <dd className="min-w-0 truncate text-right text-[12.5px] font-medium text-slate-800">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Score meter — horizontal bar used for EMQ, coverage and health scores
 * ────────────────────────────────────────────────────────────────────────── */

const METER_FILL: Record<MetaTone, string> = {
  neutral: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
  brand: "bg-[#1877F2]",
};

export interface MetaMeterProps {
  /** 0..1 */
  ratio: number;
  tone?: MetaTone;
  label?: string;
  valueLabel?: string;
}

export function MetaMeter({ ratio, tone, label, valueLabel }: MetaMeterProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const resolvedTone = tone ?? scoreTone(clamped, 1);
  return (
    <div>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="text-[12px] text-slate-600">{label}</span>}
          {valueLabel && (
            <span className="text-[12px] font-semibold tabular-nums text-slate-900">
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${METER_FILL[resolvedTone]}`}
          style={{ width: `${Math.round(clamped * 100)}%` }}
        />
      </div>
    </div>
  );
}
