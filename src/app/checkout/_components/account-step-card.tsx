import { User, CheckCircle, LogIn, UserPlus } from "lucide-react";

interface AccountStepCardProps {
  isLoggedIn: boolean;
  loggedInEmail: string;
  isEmailVerified: boolean;
  onSignOut: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export function AccountStepCard({
  isLoggedIn,
  loggedInEmail,
  isEmailVerified,
  onSignOut,
  onOpenLogin,
  onOpenRegister,
}: AccountStepCardProps) {
  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Your account
        </h2>
        <span className="text-[11px] font-semibold text-white/50">
          {isLoggedIn ? "Authenticated" : "Optional"}
        </span>
      </div>

      {isLoggedIn ? (
        /* Signed In State */
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#530911] border border-[#E1B76F]/40 flex items-center justify-center text-[#E1B76F]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-white/70">Logged in as</p>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                {loggedInEmail}
                {isEmailVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    Verified
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs text-[#E1B76F] hover:underline font-semibold cursor-pointer text-left sm:text-right"
          >
            Switch account / Log out
          </button>
        </div>
      ) : (
        /* Guest State with Side-by-side Log in & Create account cards */
        <div>
          <p className="text-xs text-white/80 mb-3.5">
            Already have an account?
          </p>
          <div className="grid grid-cols-2 gap-3 mb-2.5">
            {/* Log in Button */}
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E1B76F]/30 bg-[#42070e] hover:border-[#E1B76F] hover:bg-[#530911] text-xs font-bold text-white transition cursor-pointer shadow-2xs group"
            >
              <LogIn className="h-3.5 w-3.5 text-[#E1B76F] group-hover:translate-x-0.5 transition" />
              <span>Log in</span>
            </button>

            {/* Create account Button */}
            <button
              type="button"
              onClick={onOpenRegister}
              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E1B76F]/30 bg-[#42070e] hover:border-[#E1B76F] hover:bg-[#530911] text-xs font-bold text-white transition cursor-pointer shadow-2xs group"
            >
              <UserPlus className="h-3.5 w-3.5 text-[#E1B76F] group-hover:scale-110 transition" />
              <span>Create account</span>
            </button>
          </div>
          <p className="text-[11.5px] text-white/50 leading-relaxed">
            Or continue as a guest without creating an account.
          </p>
        </div>
      )}
    </div>
  );
}
