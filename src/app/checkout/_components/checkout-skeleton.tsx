export function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-[#530911] text-white">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="h-6 w-48 rounded-lg bg-[#42070e] animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.82fr] gap-10">
          <div className="space-y-4">
            <div className="h-32 rounded-2xl bg-[#42070e] animate-pulse" />
            <div className="h-96 rounded-2xl bg-[#42070e] animate-pulse" />
          </div>
          <div className="h-[480px] rounded-2xl bg-[#42070e] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
