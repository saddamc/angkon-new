"use client";

import { cn } from "@/lib/utils";

const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

export function SizeSelector({
  value,
  onChange,
  availableSizes,
}: {
  value: string;
  onChange: (size: string) => void;
  availableSizes?: string[];
}) {
  const sizes = availableSizes && availableSizes.length > 0
    ? ALL_SIZES.filter((s) => availableSizes.includes(s))
    : ALL_SIZES;

  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          className={cn(
            "flex h-9 min-w-[2.75rem] items-center justify-center rounded border px-3 text-xs font-semibold uppercase transition-all duration-200",
            value === size
              ? "border-2 border-[#E1B76F] bg-[#E1B76F] text-[#400604] font-bold shadow-md"
              : "border-[#E1B76F]/30 bg-[#340402] text-[#f0d29d] hover:border-[#E1B76F] hover:text-[#E1B76F]",
          )}
          onClick={() => onChange(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
}
