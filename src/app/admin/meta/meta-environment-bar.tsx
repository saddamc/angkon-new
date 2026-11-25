import { AlertTriangle, CheckCircle2, Database, Server, ShieldAlert } from "lucide-react";
import type { RuntimeEnvironmentInfo } from "@/server/env/app-environment";

interface MetaEnvironmentBarProps {
  info: RuntimeEnvironmentInfo;
}

function environmentLabel(info: RuntimeEnvironmentInfo): string {
  switch (info.environment) {
    case "production":
      return "Production";
    case "preview":
      return "Preview";
    case "test":
      return "Test";
    default:
      return "Development";
  }
}

/**
 * Always-visible environment strip for the Meta Marketing Suite.
 *
 * The Meta suite talks to real Meta datasets and reports real revenue, so it
 * must never be ambiguous which environment the operator is looking at. This
 * bar is rendered on the server from the same resolver the database isolation
 * guard uses, so it can never disagree with the actual runtime.
 */
export function MetaEnvironmentBar({ info }: MetaEnvironmentBarProps) {
  const label = environmentLabel(info);
  const isProduction = info.environment === "production";
  const productionOnDevServer = isProduction && info.isDevServer;

  const tone = productionOnDevServer
    ? "border-amber-300 bg-amber-50 text-amber-950"
    : isProduction
      ? "border-emerald-300 bg-emerald-50 text-emerald-950"
      : "border-blue-300 bg-blue-50 text-blue-950";

  return (
    <div
      role="status"
      aria-label={`Meta environment: ${label}, database ${info.actualDatabase}`}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b px-4 py-2 text-[11.5px] font-medium ${tone}`}
    >
      <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wide">
        {productionOnDevServer ? (
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
        ) : isProduction ? (
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Environment: {label}
      </span>

      <span className="inline-flex items-center gap-1.5">
        <Database className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        Database: <strong className="font-semibold">{info.actualDatabase}</strong>
      </span>

      <span className="inline-flex items-center gap-1.5">
        <Server className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        Runtime:{" "}
        <strong className="font-semibold">
          {info.isVercel ? "Vercel" : info.isDevServer ? "Local dev server" : "Node server"}
        </strong>
      </span>

      {productionOnDevServer && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/70 bg-amber-100 px-2 py-0.5 font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Live production database on a development server — changes here are real and local
          test events reach the production Meta dataset.
        </span>
      )}

      {!info.isolationValid && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/70 bg-rose-100 px-2 py-0.5 font-semibold text-rose-950">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Database isolation check failed.
        </span>
      )}
    </div>
  );
}
