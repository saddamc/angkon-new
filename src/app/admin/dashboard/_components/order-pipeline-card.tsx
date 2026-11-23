import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Package, RotateCcw, Truck } from "lucide-react";
import type { PipelineItem } from "../_types/dashboard.types";

export function OrderPipelineCard({
  pipeline,
  paymentIssues,
  discrepancy,
}: {
  pipeline: PipelineItem[];
  paymentIssues: number;
  discrepancy: number;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
      <h2 className="text-[13px] font-bold text-gray-800">Order pipeline</h2>
      <p className="text-[10.5px] text-gray-400">Jump straight into a working queue.</p>
      <ul className="mt-3 space-y-1">
        {pipeline.map((p) => (
          <li key={p.key}>
            <Link
              href={p.href}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 transition hover:bg-purple-50/60"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-gray-700">
                {p.key === "pending" && <Clock className={`h-3.5 w-3.5 ${p.tone}`} />}
                {p.key === "ready_to_book" && <Package className={`h-3.5 w-3.5 ${p.tone}`} />}
                {p.key === "in_transit" && <Truck className={`h-3.5 w-3.5 ${p.tone}`} />}
                {p.key === "delivered" && <CheckCircle2 className={`h-3.5 w-3.5 ${p.tone}`} />}
                {p.key === "issues" && <RotateCcw className={`h-3.5 w-3.5 ${p.tone}`} />}
                {p.label}
              </span>
              <span className="text-[13px] font-bold tabular-nums text-gray-900">
                {p.value.toLocaleString("en-BD")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-amber-800">
          <AlertTriangle className="h-3 w-3" />
          {paymentIssues} payment issue{paymentIssues === 1 ? "" : "s"} · {discrepancy} COD discrepancy
        </p>
      </div>
    </div>
  );
}
