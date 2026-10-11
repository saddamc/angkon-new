import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#E1B76F]/10 border border-[#E1B76F]/10", className)} />;
}

export { Skeleton };
