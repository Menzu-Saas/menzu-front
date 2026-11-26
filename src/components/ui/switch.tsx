"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** 40x22 pill, knob 18; on = success, off = track-off (design-system §8). */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-full bg-track-off p-0.5",
        "transition-colors duration-150 ease-out data-[state=checked]:bg-success",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4.5 rounded-full bg-surface shadow-segment",
          "transition-transform duration-150 ease-out data-[state=checked]:translate-x-4.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
