"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Soft shimmer bone — matches ANGKON luxury surfaces */
function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-100/60 via-stone-100 to-amber-100/60",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionLabel() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Bone className="h-4 w-4 rounded-md" />
      <Bone className="h-3.5 w-28" />
    </div>
  );
}

function Field({ wide }: { wide?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Bone className="h-2.5 w-20" />
      <Bone className={cn("h-10 w-full rounded-xl", wide && "h-24")} />
    </div>
  );
}

/**
 * Content-aware loading shell for the product editor.
 */
export function ProductFormSkeleton({
  title = "Loading product",
  subtitle = "Preparing editor…",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      className="space-y-5"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{title}. {subtitle}</span>

      {/* Progress bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-stone-100">
        <div className="absolute inset-y-0 w-1/3 animate-pulse rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600" />
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Bone className="h-9 w-9 rounded-xl" />
        <div className="flex items-center gap-2">
          <Bone className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Bone className="h-5 w-36" />
            <Bone className="h-3 w-48" />
          </div>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 border border-purple-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-600" />
          </span>
          <span className="text-[11px] font-semibold text-purple-700">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <SectionLabel />
            <div className="space-y-4">
              <Field />
              <div className="grid grid-cols-2 gap-4">
                <Field />
                <Field />
              </div>
              <Field />
            </div>
          </Card>

          <Card>
            <SectionLabel />
            <div className="space-y-4">
              <Field wide />
              <Field wide />
            </div>
          </Card>

          <Card>
            <SectionLabel />
            <div className="mb-4 grid grid-cols-3 gap-2">
              <Bone className="h-16 rounded-xl" />
              <Bone className="h-16 rounded-xl" />
              <Bone className="h-16 rounded-xl" />
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="h-28 w-28 rounded-xl" />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionLabel />
            <div className="space-y-4">
              <Field />
              <Field />
              <Field />
            </div>
          </Card>

          <Card>
            <SectionLabel />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Bone key={i} className="h-9 w-11 rounded-xl" />
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Bone key={i} className="h-9 w-20 rounded-xl" />
              ))}
            </div>
          </Card>

          <Card>
            <Bone className="mb-3 h-10 w-full rounded-xl" />
            <Bone className="h-10 w-full rounded-xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}
