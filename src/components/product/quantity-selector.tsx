"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuantitySelector({ value, onChange }: { value: number; onChange: (qty: number) => void }) {
  return (
    <div className="inline-flex items-center border border-[#E1B76F]/30 bg-[#2d0302] rounded-md overflow-hidden">
      <Button variant="ghost" size="icon" className="rounded-none hover:bg-[#400604] h-10 w-10 text-white/80 hover:text-[#E1B76F]" type="button" onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-12 text-center text-[15px] font-bold text-white">{value}</span>
      <Button variant="ghost" size="icon" className="rounded-none hover:bg-[#400604] h-10 w-10 text-white/80 hover:text-[#E1B76F]" type="button" onClick={() => onChange(value + 1)}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
