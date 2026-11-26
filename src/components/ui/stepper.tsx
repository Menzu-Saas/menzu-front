"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "lg";
  disabled?: boolean;
  /** Accessible name of the group. */
  label?: string;
  className?: string;
}

const SIZES = {
  sm: { root: "min-h-11 gap-1 rounded-xl px-1", value: "min-w-4 text-body-sm", btn: "size-11 rounded-lg", icon: 15 },
  lg: { root: "h-13.5 gap-2 rounded-2xl px-2", value: "min-w-5 text-item", btn: "size-11 rounded-lg", icon: 18 },
} as const;

/** Shared quantity controls keep 44px touch targets in cart and product views. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = "sm",
  disabled = false,
  label = "Quantidade",
  className,
}: StepperProps) {
  const s = SIZES[size];
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;
  const btn = cn(
    "inline-flex shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 ease-out",
    "not-disabled:hover:bg-surface-muted not-disabled:active:translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed",
    // When the whole stepper is disabled only the group fades (once); otherwise fade the unavailable button.
    !disabled && "disabled:opacity-50",
    s.btn,
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center border border-line bg-surface", s.root, disabled && "opacity-50", className)}
    >
      <button
        type="button"
        aria-label="Diminuir"
        disabled={!canDec}
        onClick={() => canDec && onChange(value - 1)}
        className={cn(btn, "text-ink-faint")}
      >
        <Minus size={s.icon} strokeWidth={2.1} strokeLinecap="round" aria-hidden="true" />
      </button>
      <span aria-live="polite" className={cn("text-center font-extrabold tabular-nums text-ink", s.value)}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Aumentar"
        disabled={!canInc}
        onClick={() => canInc && onChange(value + 1)}
        className={cn(btn, "text-brand")}
      >
        <Plus size={s.icon} strokeWidth={2.1} strokeLinecap="round" aria-hidden="true" />
      </button>
    </div>
  );
}
