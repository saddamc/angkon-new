import { Sparkles, CheckCircle2, User } from "lucide-react";

interface PointsIncentiveBannerProps {
  points: number;
  isLoggedIn: boolean;
  loggedInEmail: string;
  onOpenLogin: () => void;
}

export function PointsIncentiveBanner({
  points,
  isLoggedIn,
  loggedInEmail,
  onOpenLogin,
}: PointsIncentiveBannerProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E1B76F]/25 bg-[#3b050b] p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E1B76F]/15 text-[#E1B76F]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold text-white">
            You are earning{" "}
            <span className="font-bold text-[#E1B76F]">{points} ANGKON Points</span>
          </p>
          <p className="text-[11px] sm:text-xs text-white/65">
            Use ANGKON loyalty points to pay for your next luxury order!
          </p>
        </div>
      </div>

      <div className="shrink-0 self-start sm:self-auto">
        {isLoggedIn ? (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="max-w-[160px] truncate">{loggedInEmail || "Signed In"}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#27408B] hover:bg-[#1E3270] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <User className="h-3.5 w-3.5" />
            Login to Avail
          </button>
        )}
      </div>
    </div>
  );
}
