"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (button, link). */
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/** Dark tooltip: inverse background, 12/600 white, radius 9. Opens on hover and keyboard focus. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 max-w-60 rounded-sm bg-inverse px-2.5 py-1.5 text-caption font-semibold text-white",
              "motion-safe:data-[state=delayed-open]:animate-pop-in",
              className,
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-inverse" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
