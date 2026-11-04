"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import { META_CARD, META_EYEBROW, MetaBadge, MetaCallout } from "@/components/admin/meta/meta-ui";

interface CollectionStat {
  name: string;
  count: number;
}

interface BackupSummary {
  format?: string;
  version?: number;
  generatedAt?: string;
  database?: string;
  collections: Array<{ name: string; documents: unknown[] }>;
}

interface RestoreReport {
  collections: Array<{ name: string; matched: number; modified: number; upserted: number }>;
  skipped: Array<{ name: string; reason: string }>;
}

const BACKUP_FORMAT = "angkon-db-backup";
const BACKUP_VERSION = 1;
const CONFIRM_PHRASE = "RESTORE";

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export default function DatabaseBackupPage() {
  const [stats, setStats] = useState<CollectionStat[] | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [includeUsers, setIncludeUsers] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [restoring, setRestoring] = useState(false);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/admin/meta/backup?stats=1", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not read database statistics.");
      setStats(json.stats as CollectionStat[]);
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : "Could not read database statistics.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const totalDocuments = (stats ?? []).reduce((sum, item) => sum + item.count, 0);

  const handleFile = async (selected: File | null) => {
    setFile(selected);
    setSummary(null);
    setFileError(null);
    setReport(null);
    setRestoreError(null);
    setConfirmText("");

    if (!selected) return;

    try {
      const text = await selected.text();
      const parsed = JSON.parse(text) as BackupSummary;

      if (parsed.format !== BACKUP_FORMAT) {
        throw new Error("This file is not an ANGKON database backup.");
      }
      if (parsed.version !== BACKUP_VERSION) {
        throw new Error(`Unsupported backup version ${String(parsed.version)}.`);
      }
      if (!Array.isArray(parsed.collections)) {
        throw new Error("The backup contains no collections.");
      }

      setSummary(parsed);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not read this file.");
      setFile(null);
    }
  };

  const canRestore =
    Boolean(summary) && !restoring && confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleRestore = async () => {
    if (!file || !canRestore) return;

    setRestoring(true);
    setRestoreError(null);
    setReport(null);

    try {
      const text = await file.text();
      const res = await fetch(
        `/api/admin/meta/backup${includeUsers ? "?includeUsers=1" : ""}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: text,
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "The restore failed.");

      setReport(json.report as RestoreReport);
      setConfirmText("");
      await loadStats();
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "The restore failed.");
    } finally {
      setRestoring(false);
    }
  };

  const summaryDocuments = summary
    ? summary.collections.reduce((sum, collection) => sum + collection.documents.length, 0)
    : 0;

  return (
    <div className="space-y-6 pb-24">
      <MetaNavigationHeader />

      <div className="flex flex-col gap-2">
        <p className={META_EYEBROW}>Data safety</p>
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-slate-900 sm:text-2xl">
          Backup &amp; restore
        </h2>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-slate-500">
          Download a complete snapshot of every collection, or merge a previous snapshot back in.
          Restores are upserts — nothing is ever dropped, and running the same file twice is safe.
        </p>
      </div>

      {/* ── Current database ── */}
      <section className={`${META_CARD} overflow-hidden`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[13.5px] font-semibold text-slate-900">Current database</h3>
              <p className="text-[11.5px] text-slate-500">
                {statsLoading
                  ? "Reading collections…"
                  : `${formatCount(stats?.length ?? 0)} collections · ${formatCount(totalDocuments)} documents`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStats()}
              disabled={statsLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {statsLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh
            </button>

            <a
              href="/api/admin/meta/backup"
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-2xs transition hover:bg-[#166FE5]"
            >
              <Download className="h-3 w-3" />
              Download backup
            </a>
          </div>
        </header>

        <div className="px-5 py-4">
          {statsError ? (
            <MetaCallout tone="danger" title="Could not read the database" icon={<AlertTriangle className="h-4 w-4" />}>
              {statsError}
            </MetaCallout>
          ) : (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-100 sm:grid-cols-3 xl:grid-cols-4">
              {(stats ?? []).map((item) => (
                <div key={item.name} className="bg-white px-3.5 py-2.5">
                  <p className="truncate font-mono text-[11px] text-slate-500">{item.name}</p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-900">
                    {formatCount(item.count)}
                  </p>
                </div>
              ))}
              {!statsLoading && (stats?.length ?? 0) === 0 && (
                <div className="bg-white px-3.5 py-2.5 text-[12px] text-slate-500">
                  No collections found.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Restore ── */}
      <section className={`${META_CARD} overflow-hidden`}>
        <header className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <HardDriveDownload className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[13.5px] font-semibold text-slate-900">Restore from a backup</h3>
            <p className="text-[11.5px] text-slate-500">
              Merge mode — existing records are updated, never deleted.
            </p>
          </div>
        </header>

        <div className="space-y-4 px-5 py-4">
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Upload className="h-3 w-3" />
              Choose backup file
            </button>
            {file && (
              <span className="truncate font-mono text-[11px] text-slate-500">{file.name}</span>
            )}
            {file && (
              <button
                type="button"
                onClick={() => void handleFile(null)}
                className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {fileError && (
            <MetaCallout tone="danger" title="This file cannot be restored" icon={<AlertTriangle className="h-4 w-4" />}>
              {fileError}
            </MetaCallout>
          )}

          {summary && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <MetaBadge tone="info">Valid backup</MetaBadge>
                <span className="text-[11.5px] text-slate-600">
                  {formatCount(summary.collections.length)} collections ·{" "}
                  {formatCount(summaryDocuments)} documents
                </span>
                {summary.generatedAt && (
                  <span className="text-[11.5px] text-slate-500">
                    · taken {summary.generatedAt.replace("T", " ").slice(0, 19)} UTC
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">
                Source database:{" "}
                <span className="font-mono text-slate-700">{summary.database || "unknown"}</span>
              </p>
            </div>
          )}

          <MetaCallout tone="warning" title="Before you restore" icon={<AlertTriangle className="h-4 w-4" />}>
            Records are matched by <span className="font-mono">_id</span> and overwritten with the
            values in the file. Anything created after the backup is kept. The{" "}
            <span className="font-mono">users</span> collection is skipped unless you opt in below —
            restoring it can overwrite the account you are signed in with.
          </MetaCallout>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5">
            <input
              type="checkbox"
              checked={includeUsers}
              onChange={(event) => setIncludeUsers(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded text-amber-600 focus:ring-amber-500"
            />
            <span>
              <span className="block text-[12.5px] font-semibold text-slate-800">
                Also restore the users collection
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-slate-500">
                Only enable this if you are deliberately rolling accounts back. Your current session
                cookie may stop working.
              </span>
            </span>
          </label>

          {summary && (
            <div className="space-y-2">
              <label className="block text-[11.5px] font-semibold text-slate-700">
                Type <span className="font-mono text-slate-900">{CONFIRM_PHRASE}</span> to confirm
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  className="h-9 w-40 rounded-lg border border-slate-300 px-3 font-mono text-[12px] text-slate-900 outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => void handleRestore()}
                  disabled={!canRestore}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-[11.5px] font-semibold text-white shadow-2xs transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {restoring ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3 w-3" />
                  )}
                  {restoring ? "Restoring…" : "Restore now"}
                </button>
              </div>
            </div>
          )}

          {restoreError && (
            <MetaCallout tone="danger" title="Restore failed" icon={<AlertTriangle className="h-4 w-4" />}>
              {restoreError}
            </MetaCallout>
          )}

          {report && (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-[12.5px] font-semibold text-emerald-900">Restore complete</p>
              </div>
              <ul className="space-y-1">
                {report.collections.map((item) => (
                  <li key={item.name} className="text-[11.5px] text-emerald-900">
                    <span className="font-mono">{item.name}</span> — {item.upserted} inserted,{" "}
                    {item.modified} updated, {item.matched} matched
                  </li>
                ))}
                {report.skipped.map((item) => (
                  <li key={item.name} className="text-[11.5px] text-amber-800">
                    <span className="font-mono">{item.name}</span> — skipped ({item.reason})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
