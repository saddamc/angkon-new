"use client";

import { cn } from "@/lib/utils";

const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

export function SizeSelector({
  value,
  onChange,
  availableSizes,
  disabledSizes,
}: {
  value: string;
  onChange: (size: string) => void;
  availableSizes?: string[];
  disabledSizes?: string[];
}) {
  const sizes = availableSizes && availableSizes.length > 0
    ? ALL_SIZES.filter((s) => availableSizes.includes(s))
    : ALL_SIZES;

  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Choose size">
      {sizes.map((size) => {
        const isSelected = value === size;
        const isDisabled = disabledSizes?.includes(size);

        return (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Size ${size}`}
            disabled={isDisabled}
            className={cn(
              "flex min-h-[42px] min-w-[44px] items-center justify-center rounded-lg border px-3.5 text-xs font-bold uppercase transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1B76F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#400604]",
              isSelected
                ? "border-2 border-[#E1B76F] bg-[#E1B76F] text-[#400604] font-extrabold shadow-md ring-1 ring-[#E1B76F]"
                : "border-[#E1B76F]/30 bg-[#340402] text-white/90 hover:border-[#E1B76F] hover:bg-[#400604] hover:text-[#E1B76F]",
              isDisabled && "opacity-40 cursor-not-allowed border-white/10 bg-black/20 text-white/40 line-through hover:border-white/10 hover:bg-black/20 hover:text-white/40"
            )}
            onClick={() => !isDisabled && onChange(size)}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
}
