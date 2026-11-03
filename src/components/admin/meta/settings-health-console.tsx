"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Globe,
  Layers,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { META_CARD, META_EYEBROW, MetaBadge, MetaMeter, scoreLabel, scoreTone } from "./meta-ui";
import {
  HEALTH_STATE_LABEL,
  buildSettingsHealth,
  computeReadiness,
  formatStamp,
  type SettingsHealthData,
  type SettingsSectionId,
} from "./settings-health";

/**
 * Configuration Health Console.
 *
 * A single glance at whether the Meta suite is actually production-ready.
 * Every tile is derived from real saved settings — no decorative statuses —
 * and doubles as a jump target into the matching settings section.
 */

const SECTION_ICON: Record<SettingsSectionId, LucideIcon> = {
  general: Layers,
  dataset: Activity,
  ads: BarChart3,
  capi: Server,
  catalog: ShoppingBag,
  domain: Globe,
  security: ShieldCheck,
  sync: RefreshCw,
};

export interface SettingsHealthConsoleProps {
  data: SettingsHealthData | null;
  loading?: boolean;
  onOpenSection: (id: SettingsSectionId) => void;
}

const DOT_CLASS = {
  ready: "bg-emerald-500",
  partial: "bg-amber-500",
  missing: "bg-rose-400",
} as const;

const STATE_TEXT_CLASS = {
  ready: "text-emerald-600",
  partial: "text-amber-600",
  missing: "text-rose-500",
} as const;

export function SettingsHealthConsole({
  data,
  loading = false,
  onOpenSection,
}: SettingsHealthConsoleProps) {
  const isAuditing = loading || data === null;
  const items = buildSettingsHealth(data);
  const { ratio, percent, readyCount, total } = computeReadiness(items);
  const tone = isAuditing ? "neutral" : scoreTone(ratio, 1);

  return (
    <section className={`${META_CARD} overflow-hidden`} aria-label="Configuration health">
      <div className="grid gap-0 lg:grid-cols-[236px_minmax(0,1fr)]">
        {/* ── Readiness summary ── */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 lg:border-b-0 lg:border-r">
          <p className={META_EYEBROW}>Configuration health</p>

          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-slate-900">
              {isAuditing ? (
                <span className="inline-block h-8 w-14 rounded-lg bg-slate-200/80 animate-pulse align-middle" />
              ) : (
                percent
              )}
            </span>
            <span className="text-sm font-medium text-slate-400">{isAuditing ? "" : "%"}</span>
          </div>

          <div className="mt-2">
            <MetaBadge tone={isAuditing ? "neutral" : tone}>
              {isAuditing ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                  <span>Checking status…</span>
                </span>
              ) : (
                scoreLabel(ratio, 1)
              )}
            </MetaBadge>
          </div>

          <div className="mt-3.5">
            {isAuditing ? (
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-2/5 bg-slate-300 rounded-full animate-pulse" />
              </div>
            ) : (
              <MetaMeter ratio={ratio} tone={tone} />
            )}
          </div>

          <p className="mt-3 text-[11.5px] leading-snug text-slate-500">
            {isAuditing ? (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                Auditing active subsystems…
              </span>
            ) : (
              `${readyCount} of ${total} subsystems fully configured.`
            )}
          </p>
        </div>

        {/* ── Subsystem tiles ── */}
        <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = SECTION_ICON[item.id];
            return (
              <button
                key={item.id}
                type="button"
                disabled={isAuditing}
                onClick={() => onOpenSection(item.id)}
                className={`group flex flex-col gap-2 bg-white px-4 py-3.5 text-left transition ${
                  isAuditing
                    ? "cursor-default"
                    : "hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1877F2]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition ${
                        isAuditing ? "" : "group-hover:bg-[#1877F2]/10 group-hover:text-[#1877F2]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-[12px] font-medium leading-snug text-slate-700">
                      {item.label}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      isAuditing ? "bg-slate-300 animate-pulse" : DOT_CLASS[item.state]
                    }`}
                  />
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  {isAuditing ? (
                    <span className="h-2.5 w-20 rounded bg-slate-100 animate-pulse" />
                  ) : (
                    <span className="truncate font-mono text-[10.5px] text-slate-400">{item.detail}</span>
                  )}
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                      isAuditing ? "text-slate-400" : STATE_TEXT_CLASS[item.state]
                    }`}
                  >
                    {isAuditing ? "Checking…" : HEALTH_STATE_LABEL[item.state]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Setup checklist — only when not fully configured ── */}
      {!loading && percent < 100 && (
        <div className="border-t border-amber-200/70 bg-amber-50/50 px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-amber-900">
                {total - readyCount > 0
                  ? `${total - readyCount} subsystem${total - readyCount === 1 ? "" : "s"} need${total - readyCount === 1 ? "s" : ""} configuration`
                  : "Some subsystems are partially configured"}
              </p>
              <ul className="mt-1.5 space-y-1">
                {items
                  .filter((item) => item.state !== "ready")
                  .map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onOpenSection(item.id)}
                        className="group inline-flex items-baseline gap-1.5 text-[11.5px] text-amber-800 transition hover:text-amber-950"
                      >
                        <span className="font-semibold">{item.label}:</span>
                        <span className="text-amber-700 group-hover:text-amber-950">
                          {item.detail}
                        </span>
                        <span className="text-amber-500 group-hover:text-amber-700">→</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Sync provenance ── */}
      <div className="flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-2.5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3 w-3 text-slate-400" />
            Last sync{" "}
            <span className="font-medium text-slate-700">{formatStamp(data?.sync?.lastSuccessfulSync)}</span>
          </span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span>
            Next <span className="font-medium text-slate-700">{formatStamp(data?.sync?.nextScheduledSync)}</span>
          </span>
          {data?.sync?.durationMs ? (
            <>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span>
                Duration <span className="font-medium text-slate-700">{data.sync.durationMs} ms</span>
              </span>
            </>
          ) : null}
        </div>

        {loading ? (
          <MetaBadge tone="neutral">Verifying sync state…</MetaBadge>
        ) : data?.sync?.lastError ? (
          <MetaBadge tone="warning">Last sync reported an error</MetaBadge>
        ) : (
          <MetaBadge tone={data?.sync?.lastSuccessfulSync ? "success" : "neutral"}>
            {data?.sync?.lastSuccessfulSync ? "Synchronization healthy" : "No synchronization yet"}
          </MetaBadge>
        )}
      </div>
    </section>
  );
}
