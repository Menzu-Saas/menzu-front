"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";
import { overlayClass } from "./modal";

const WIDTH = {
  sm: "max-w-80",
  md: "max-w-110",
  lg: "max-w-140",
} as const;

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "right" | "left";
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** md = 440px, lg = 560px (sm = 320px, for navigation). Always capped at the viewport width. */
  width?: keyof typeof WIDTH;
  /** Replace the header title with custom content (e.g. the logo); `title` stays the accessible name. */
  header?: ReactNode;
  className?: string;
}

/** Full-height side panel: white surface, frame shadow, header with close, scrollable body, sticky footer. */
export function Drawer({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  children,
  footer,
  width = "md",
  header,
  className,
}: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClass} />
        <DialogPrimitive.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed inset-y-0 z-50 flex w-full flex-col bg-surface text-ink shadow-frame outline-none",
            side === "right"
              ? "right-0 border-l border-frame motion-safe:data-[state=open]:animate-drawer-in-right motion-safe:data-[state=closed]:animate-drawer-out-right"
              : "left-0 border-r border-frame motion-safe:data-[state=open]:animate-drawer-in-left motion-safe:data-[state=closed]:animate-drawer-out-left",
            WIDTH[width],
            className,
          )}
        >
          <div className="flex items-center gap-3 border-b border-line px-5.5 py-4.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogPrimitive.Title className={cn("text-title-md text-ink", header != null && "sr-only")}>
                {title}
              </DialogPrimitive.Title>
              {header}
              {description && (
                <DialogPrimitive.Description className="text-body-sm font-normal text-ink-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="Fechar" icon={X} size={34} />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5.5 py-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-surface px-5.5 py-4">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
