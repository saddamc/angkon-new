"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuantitySelector({ value, onChange }: { value: number; onChange: (qty: number) => void }) {
  return (
    <div className="inline-flex items-center border border-gray-200">
      <Button variant="ghost" size="icon" className="rounded-none hover:bg-gray-100 h-10 w-10 text-gray-500" type="button" onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-12 text-center text-[15px] font-medium text-gray-900">{value}</span>
      <Button variant="ghost" size="icon" className="rounded-none hover:bg-gray-100 h-10 w-10 text-gray-500" type="button" onClick={() => onChange(value + 1)}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
