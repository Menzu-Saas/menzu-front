"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const box =
  "inline-flex size-5 shrink-0 items-center justify-center rounded-xs border-2 transition-[background-color,border-color] duration-150 ease-out";
const boxOff = "border-control bg-surface";
const boxOn = "border-accent bg-accent text-white";

/** Presentational checkbox mark (for rows where the whole row is the control, e.g. OptionCard). */
export function CheckboxMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn(box, checked ? boxOn : boxOff, className)}>
      {checked && <Check size={14} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
    </span>
  );
}

/** 20px, radius 6; checked = accent fill with white check (design-system §8). */
export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        box,
        boxOff,
        "not-disabled:hover:border-ink-faint",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-white",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="inline-flex items-center justify-center">
        <Check size={14} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
