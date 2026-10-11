"use client";

export default function CategoryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container mx-auto max-w-[1500px] px-4 py-24 text-center bg-[#400604]">
      <div className="mb-4 text-5xl">⚠️</div>
      <p className="text-base font-semibold text-[#E1B76F]">Unable to load categories</p>
      <p className="mt-1.5 text-sm text-[#f0d29d]">Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-full bg-[#E1B76F] px-6 py-2.5 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87]"
      >
        Retry
      </button>
    </div>
  );
}
