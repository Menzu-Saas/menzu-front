"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const circle =
  "inline-flex size-4.5 shrink-0 rounded-full border-2 bg-surface transition-[border-color,border-width] duration-150 ease-out";

/** Presentational radio mark (for rows where the whole row is the control, e.g. OptionCard). */
export function RadioMark({ checked, className }: { checked: boolean; className?: string }) {
  return <span aria-hidden="true" className={cn(circle, checked ? "border-5 border-accent" : "border-control", className)} />;
}

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2.5", className)} {...props} />;
}

/** 18px circle; checked = 5px accent border (design-system §8). */
export function RadioItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        circle,
        "border-control not-disabled:hover:border-ink-faint",
        "data-[state=checked]:border-5 data-[state=checked]:border-accent",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
