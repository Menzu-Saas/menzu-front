"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;

/** Floating panel shared by DropdownMenu and Popover: radius 16, 1px line, frame shadow. */
export const floatingPanel = cn(
  "z-50 rounded-2xl border border-line bg-surface text-ink shadow-frame outline-none",
  "motion-safe:data-[state=open]:animate-pop-in",
);

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(floatingPanel, "flex min-w-48 flex-col gap-0.5 p-1.5", className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export interface DropdownMenuItemProps extends ComponentProps<typeof DropdownPrimitive.Item> {
  icon?: LucideIcon;
  tone?: "default" | "danger";
}

/** Item: radius 11, 13/600, highlighted = surface-muted; danger tone for destructive actions. */
export function DropdownMenuItem({ className, icon, tone = "default", children, ...props }: DropdownMenuItemProps) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-md px-3 py-2.5 text-body-sm outline-none",
        "transition-colors duration-150 ease-out data-highlighted:bg-surface-muted",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        tone === "danger" ? "text-danger" : "text-ink-secondary data-highlighted:text-ink",
        className,
      )}
      {...props}
    >
      {icon && <Icon icon={icon} size={18} className={tone === "danger" ? "text-danger" : "text-ink-subtle"} />}
      {children}
    </DropdownPrimitive.Item>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn("eyebrow px-3 pt-2 pb-1 text-ink-faint", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn("mx-1 my-1 h-px bg-line", className)} {...props} />;
}
