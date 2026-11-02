"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Sparkles, Target } from "lucide-react";
import type { EmqDiagnostic, EmqMatchKey, EmqReport } from "@/server/meta-emq";
import {
  META_EYEBROW,
  MetaBadge,
  MetaCallout,
  MetaEmptyState,
  MetaMeter,
  MetaSection,
  scoreLabel,
  scoreTone,
} from "./meta-ui";

/* ──────────────────────────────────────────────────────────────────────────
 * Data loading — cached module-wide so the KPI tile and this panel share a
 * single request instead of hitting the endpoint twice per render cycle.
 * ────────────────────────────────────────────────────────────────────────── */

interface EmqSuccess {
  report: EmqReport;
  tokenSource: "marketing" | "capi" | null;
}

export type EmqState =
  | { status: "loading" }
  | ({ status: "ready" } & EmqSuccess)
  | { status: "error"; reason: string; message: string };

const CACHE_TTL_MS = 60_000;

let cached: { at: number; value: EmqSuccess } | null = null;
let inflight: Promise<EmqSuccess> | null = null;

async function loadEmq(force: boolean): Promise<EmqSuccess> {
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch("/api/admin/meta/emq", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok) {
        throw Object.assign(new Error(body?.error || "Event match quality is unavailable."), {
          emqReason: body?.reason || "upstream-error",
        });
      }

      const value: EmqSuccess = {
        report: body.report,
        tokenSource: body.tokenSource ?? null,
      };
      cached = { at: Date.now(), value };
      return value;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export interface UseEventMatchQualityResult {
  state: EmqState;
  reload: () => void;
  isRefreshing: boolean;
}

/** Fetches the EMQ breakdown, reusing the shared cache between components. */
export function useEventMatchQuality(): UseEventMatchQualityResult {
  const [state, setState] = useState<EmqState>(() =>
    cached ? { status: "ready", ...cached.value } : { status: "loading" }
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const force = version > 0;

    if (state.status !== "ready" || force) {
      setState((current) => (current.status === "ready" ? current : { status: "loading" }));
      if (force) setIsRefreshing(true);
    }

    loadEmq(force)
      .then((value) => {
        if (!cancelled) setState({ status: "ready", ...value });
      })
      .catch((error: Error & { emqReason?: string }) => {
        if (!cancelled) {
          setState({
            status: "error",
            reason: error.emqReason || "upstream-error",
            message: error.message || "Event match quality is unavailable right now.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
    // `state.status` intentionally excluded: it would re-trigger on every
    // successful load. The version counter drives explicit refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { state, reload, isRefreshing };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Presentation helpers
 * ────────────────────────────────────────────────────────────────────────── */

function formatPercent(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

function formatTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) {
    return <MetaBadge tone="neutral">No score</MetaBadge>;
  }
  return (
    <MetaBadge tone={scoreTone(score, 10)}>{scoreLabel(score, 10)}</MetaBadge>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Panel
 * ────────────────────────────────────────────────────────────────────────── */

export interface EmqBreakdownProps {
  /** Called by the empty state's primary button (usually opens Settings). */
  onConfigure?: () => void;
  className?: string;
}

/**
 * Event Match Quality breakdown.
 *
 * Headline score, per-event scoring, match-key coverage and Meta's own
 * diagnostics with solutions — all read live from the Dataset Quality API.
 */
export function EmqBreakdown({ onConfigure, className = "" }: EmqBreakdownProps) {
  const { state, reload, isRefreshing } = useEventMatchQuality();

  const headerActions = (
    <button
      type="button"
      onClick={reload}
      disabled={isRefreshing}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
      {isRefreshing ? "Refreshing…" : "Refresh"}
    </button>
  );

  return (
    <MetaSection
      title="Event Match Quality"
      description="Live per-event scores and match-key coverage from Meta's Dataset Quality API."
      actions={headerActions}
      className={className}
    >
      {state.status === "loading" && <EmqSkeleton />}

      {state.status === "error" && (
        <EmqError reason={state.reason} message={state.message} onRetry={reload} />
      )}

      {state.status === "ready" && (
        <EmqReady report={state.report} tokenSource={state.tokenSource} onConfigure={onConfigure} />
      )}
    </MetaSection>
  );
}

function EmqSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading event match quality">
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

function EmqError({
  reason,
  message,
  onRetry,
}: {
  reason: string;
  message: string;
  onRetry: () => void;
}) {
  const needsSetup = reason === "not-configured" || reason === "unauthorized" || reason === "no-permission";

  return (
    <MetaCallout
      tone={needsSetup ? "warning" : "danger"}
      icon={needsSetup ? <Target className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      title={
        reason === "not-configured"
          ? "Match quality is not connected yet"
          : reason === "rate-limited"
            ? "Meta is rate limiting this request"
            : "Match quality could not be loaded"
      }
      actions={
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Retry
        </button>
      }
    >
      {message}
      {needsSetup && " Open Dataset Configuration to connect a pixel and access token."}
    </MetaCallout>
  );
}

function EmqReady({
  report,
  tokenSource,
  onConfigure,
}: {
  report: EmqReport;
  tokenSource: "marketing" | "capi" | null;
  onConfigure?: () => void;
}) {
  const score = report.compositeScore;
  const events = report.events;
  const diagnostics = events.flatMap((event) =>
    event.diagnostics.map((diagnostic) => ({ ...diagnostic, eventName: event.eventName }))
  );

  if (score === null || events.length === 0) {
    return (
      <MetaEmptyState
        icon={<Target className="h-5 w-5" />}
        title="No scored events yet"
        description="Meta scores an event once it has received enough matching parameters. Fire a few test events, then refresh."
        action={
          onConfigure && (
            <button
              type="button"
              onClick={onConfigure}
              className="inline-flex h-8 items-center rounded-lg bg-[#1877F2] px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-[#166fe5]"
            >
              Open dataset settings
            </button>
          )
        }
      />
    );
  }

  const tone = scoreTone(score, 10);

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* ── Headline score ── */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
          <p className={META_EYEBROW}>Composite score</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-slate-900">
              {score.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-slate-400">/ 10</span>
          </div>
          <div className="mt-2">
            <MetaBadge tone={tone}>{scoreLabel(score, 10)}</MetaBadge>
          </div>
          <div className="mt-3.5">
            <MetaMeter ratio={score / 10} tone={tone} />
          </div>
          <p className="mt-3 text-[11.5px] leading-snug text-slate-500">
            Mean of {events.length} tracked event{events.length === 1 ? "" : "s"}
            {report.fetchedAt ? ` · updated ${formatTime(report.fetchedAt)}` : ""}.
          </p>
        </div>

        {/* ── Per-event scoring ── */}
        <div className="min-w-0">
          <p className={META_EYEBROW}>Score by event</p>
          <ul className="mt-1 divide-y divide-slate-100">
            {events.map((event) => (
              <EventRow key={event.eventName} event={event} />
            ))}
          </ul>
        </div>
      </div>

      {/* ── Match keys + diagnostics ── */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className={META_EYEBROW}>Match-key coverage</p>
          <div className="mt-3 space-y-3.5">
            {report.matchKeys.length === 0 ? (
              <p className="text-[12.5px] text-slate-500">
                Meta did not report parameter coverage for this dataset.
              </p>
            ) : (
              report.matchKeys.map((key) => <MatchKeyRow key={key.identifier} matchKey={key} />)
            )}
          </div>
        </div>

        <div>
          <p className={META_EYEBROW}>Recommended fixes</p>
          <div className="mt-3 space-y-2">
            {report.suggestions.length === 0 ? (
              <p className="text-[12.5px] text-slate-500">
                No fixes recommended — match quality is strong across every event.
              </p>
            ) : (
              report.suggestions.slice(0, 6).map((suggestion, index) => (
                <div
                  key={suggestion}
                  className="flex gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2.5"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1877F2]/10 text-[11px] font-bold tabular-nums text-[#1877F2]">
                    {index + 1}
                  </span>
                  <p className="text-[12.5px] leading-relaxed text-slate-600">{suggestion}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Meta diagnostics (official descriptions + solutions) ── */}
      {diagnostics.length > 0 && (
        <div className="mt-6">
          <p className={META_EYEBROW}>Meta diagnostics</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {diagnostics.map((diagnostic) => (
              <DiagnosticCard
                key={`${diagnostic.eventName}-${diagnostic.name}`}
                diagnostic={diagnostic}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Provenance ── */}
      <p className="mt-6 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
        Source: Meta Dataset Quality API
        {report.datasetId ? ` · dataset ${report.datasetId}` : ""}
        {tokenSource ? ` · ${tokenSource === "marketing" ? "Marketing API" : "Conversions API"} token` : ""}
        {report.fetchedAt ? ` · fetched ${formatTime(report.fetchedAt)}` : ""}.
      </p>
    </div>
  );
}

function EventRow({ event }: { event: EmqReport["events"][number] }) {
  const score = event.score;

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-full shrink-0 sm:w-44">
        <p className="truncate text-[13px] font-medium text-slate-800">{event.eventName}</p>
        <p className="text-[11px] text-slate-400">
          {event.coverage !== null
            ? `${formatPercent(event.coverage)} of attributed events`
            : "Coverage not reported"}
          {event.extras.event_spend ? ` · spend ${event.extras.event_spend}` : ""}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <MetaMeter
          ratio={(score ?? 0) / 10}
          tone={score === null ? "neutral" : scoreTone(score, 10)}
        />
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:w-44 sm:justify-end">
        <span className="text-[13px] font-semibold tabular-nums text-slate-900">
          {score === null ? "—" : score.toFixed(1)}
        </span>
        <ScorePill score={score} />
      </div>
    </li>
  );
}

function MatchKeyRow({ matchKey }: { matchKey: EmqMatchKey }) {
  const coverage = matchKey.coverage;

  if (coverage === null) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] text-slate-600">{matchKey.label}</span>
        <span className="text-[12px] text-slate-400">Not reported</span>
      </div>
    );
  }

  return (
    <MetaMeter
      ratio={coverage}
      tone={scoreTone(coverage, 1)}
      label={matchKey.label}
      valueLabel={formatPercent(coverage)}
    />
  );
}

function DiagnosticCard({
  diagnostic,
}: {
  diagnostic: EmqDiagnostic & { eventName: string };
}) {
  return (
    <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-semibold leading-snug text-amber-900">
          {diagnostic.name}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <MetaBadge tone="neutral">{diagnostic.eventName}</MetaBadge>
          {diagnostic.percentage !== null && (
            <MetaBadge tone="warning">{formatPercent(diagnostic.percentage)}</MetaBadge>
          )}
        </div>
      </div>

      {diagnostic.description && (
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          {diagnostic.description}
        </p>
      )}

      {diagnostic.solution && (
        <p className="mt-2 flex gap-1.5 text-[12px] leading-relaxed text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{diagnostic.solution}</span>
        </p>
      )}
    </div>
  );
}
