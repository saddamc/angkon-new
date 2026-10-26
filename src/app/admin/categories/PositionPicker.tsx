"use client";

import React from "react";
import type { WCCategory } from "./types";
import { catName } from "./category-tree-utils";

interface PositionPickerProps {
  siblings: WCCategory[];
  value: number;
  onChange: (index: number) => void;
}

export function PositionPicker({
  siblings,
  value,
  onChange,
}: PositionPickerProps) {
  const last = siblings.length;
  const options: { index: number; label: string }[] = [
    { index: 0, label: "Move to first" },
  ];
  siblings.forEach((sib, i) => {
    options.push({
      index: i + 1,
      label: `After “${catName(sib)}” (position ${i + 2})`,
    });
  });
  if (last > 0) {
    options[options.length - 1].label = `Move to last (after “${catName(
      siblings[last - 1]
    )}”)`;
  }

  return (
    <select
      value={Math.max(0, Math.min(value, last))}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-700 outline-none bg-white focus:border-purple-400"
    >
      {options.map((opt) => (
        <option key={opt.index} value={opt.index}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
