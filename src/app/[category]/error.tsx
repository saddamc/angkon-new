"use client";

export default function CategoryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container mx-auto max-w-[1500px] px-4 py-24 text-center">
      <div className="mb-4 text-5xl">⚠️</div>
      <p className="text-base font-semibold text-black">Unable to load categories</p>
      <p className="mt-1.5 text-sm text-black/45">Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-black/85"
      >
        Retry
      </button>
    </div>
  );
}
