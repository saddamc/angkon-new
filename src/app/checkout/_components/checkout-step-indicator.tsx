import { MapPin, ClipboardCheck, CreditCard, CheckCircle2 } from "lucide-react";

interface CheckoutStepIndicatorProps {
  currentStep: 1 | 2 | 3;
  onStepClick: (step: 1 | 2 | 3) => void;
}

export function CheckoutStepIndicator({
  currentStep,
  onStepClick,
}: CheckoutStepIndicatorProps) {
  const steps = [
    {
      id: 1 as const,
      label: "Delivery Details",
      shortLabel: "Delivery",
      icon: MapPin,
    },
    {
      id: 2 as const,
      label: "Review & Confirm",
      shortLabel: "Review",
      icon: ClipboardCheck,
    },
    {
      id: 3 as const,
      label: "Payment Selection",
      shortLabel: "Payment",
      icon: CreditCard,
    },
  ];

  return (
    <div className="mb-8 rounded-2xl border border-[#E1B76F]/25 bg-[#35060a]/90 p-3 sm:p-4 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = currentStep > step.id;
          const Icon = isCompleted ? CheckCircle2 : step.icon;

          return (
            <div key={step.id} className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (isClickable) onStepClick(step.id);
                }}
                disabled={!isClickable}
                className={`group flex items-center gap-2.5 sm:gap-3 transition-all ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shrink-0 ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-950/50"
                      : isCurrent
                        ? "bg-[#E1B76F] text-[#230407] ring-2 ring-[#E1B76F]/50 shadow-md shadow-[#E1B76F]/20 font-black"
                        : "bg-[#280504] border border-[#E1B76F]/20 text-white/40"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </span>

                <div className="text-left hidden xs:block">
                  <span
                    className={`block text-[10px] font-semibold uppercase tracking-wider ${
                      isCompleted
                        ? "text-emerald-400"
                        : isCurrent
                          ? "text-[#E1B76F]"
                          : "text-white/40"
                    }`}
                  >
                    Step {step.id}
                  </span>
                  <span
                    className={`block text-xs sm:text-sm font-bold tracking-tight leading-tight ${
                      isCurrent
                        ? "text-white font-serif"
                        : isCompleted
                          ? "text-white/90 group-hover:text-emerald-300 transition"
                          : "text-white/40"
                    }`}
                  >
                    <span className="sm:hidden">{step.shortLabel}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </span>
                </div>
              </button>

              {/* Connecting Line between steps */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4">
                  <div
                    className={`h-0.5 w-full rounded-full transition-all duration-300 ${
                      currentStep > step.id
                        ? "bg-emerald-500/80"
                        : "bg-white/10"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
