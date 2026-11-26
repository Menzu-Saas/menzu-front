"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { floatingPanel } from "./dropdown-menu";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

/** Floating panel (radius 16, line border, frame shadow, padding 16). */
export function PopoverContent({
  className,
  sideOffset = 6,
  align = "start",
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(floatingPanel, "w-72 max-w-[calc(100vw-2rem)] p-4", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
