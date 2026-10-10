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
    <div className="flex flex-wrap gap-2.5">
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          className={cn(
            "flex h-11 min-w-[3rem] items-center justify-center rounded-[12px] border px-4 text-sm font-bold uppercase transition-all duration-200",
            value === size
              ? "border-2 border-[#E1B76F] bg-[#E1B76F] text-[#400604] shadow-md"
              : "border-[#5c0f0d] bg-[#2b0403] text-[#cbb18a] hover:border-[#E1B76F] hover:text-[#E1B76F]",
          )}
          onClick={() => onChange(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
}
