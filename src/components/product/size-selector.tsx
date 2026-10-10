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
              ? "border-2 border-black bg-black text-white"
              : "border-neutral-300 bg-white text-neutral-800 hover:border-black",
          )}
          onClick={() => onChange(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
}
