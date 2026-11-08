"use client";

import React, { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

export interface QuantitySelectorProps {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
  ariaLabel?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  disabled = false,
  size = "default",
  className = "",
  ariaLabel = "Quantity",
}: QuantitySelectorProps) {
  const [localInput, setLocalInput] = useState<string | null>(null);

  useEffect(() => {
    setLocalInput(null);
  }, [value]);

  const isMin = value <= min;
  const isMax = value >= max;

  const handleDecrease = () => {
    if (disabled || isMin) return;
    setLocalInput(null);
    onChange(Math.max(min, value - step));
  };

  const handleIncrease = () => {
    if (disabled || isMax) return;
    setLocalInput(null);
    onChange(Math.min(max, value + step));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setLocalInput(rawVal);
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (localInput === null) return;
    const trimmed = localInput.trim();
    if (trimmed === "" || isNaN(parseInt(trimmed, 10))) {
      onChange(min);
    } else {
      const parsed = parseInt(trimmed, 10);
      onChange(Math.min(max, Math.max(min, parsed)));
    }
    setLocalInput(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrease();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrease();
    }
  };

  const sizeConfig = {
    sm: {
      container: "h-9",
      btn: "w-8 text-xs",
      icon: "h-3.5 w-3.5",
      input: "w-10 text-xs",
    },
    default: {
      container: "h-11",
      btn: "w-10 text-sm",
      icon: "h-4 w-4",
      input: "w-12 text-[15px]",
    },
    lg: {
      container: "h-12",
      btn: "w-11 text-base",
      icon: "h-4 w-4",
      input: "w-14 text-base",
    },
  }[size];

  const displayVal = localInput !== null ? localInput : String(value);

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-[#E1B76F]/35 bg-[#2d0302] shadow-xs select-none transition-all duration-150 focus-within:border-[#E1B76F] focus-within:ring-1 focus-within:ring-[#E1B76F]/30 ${
        sizeConfig.container
      } ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrease}
        disabled={disabled || isMin}
        aria-label="Decrease quantity"
        title="Decrease quantity"
        className={`flex h-full items-center justify-center border-r border-[#E1B76F]/20 text-white/80 transition-all hover:bg-[#530911] hover:text-[#E1B76F] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/40 ${sizeConfig.btn}`}
      >
        <Minus className={sizeConfig.icon} />
      </button>

      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={displayVal}
        disabled={disabled}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className={`h-full bg-transparent text-center font-bold text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${sizeConfig.input}`}
      />

      <button
        type="button"
        onClick={handleIncrease}
        disabled={disabled || isMax}
        aria-label="Increase quantity"
        title="Increase quantity"
        className={`flex h-full items-center justify-center border-l border-[#E1B76F]/20 text-white/80 transition-all hover:bg-[#530911] hover:text-[#E1B76F] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/40 ${sizeConfig.btn}`}
      >
        <Plus className={sizeConfig.icon} />
      </button>
    </div>
  );
}
