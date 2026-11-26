"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

/** Scrim shared by Modal, Drawer and BottomSheet: ink at 45% (`--mz-overlay`). */
export const overlayClass = cn(
  "fixed inset-0 z-50 bg-overlay",
  "motion-safe:data-[state=open]:animate-overlay-in motion-safe:data-[state=closed]:animate-overlay-out",
);

const SIZE = {
  sm: "max-w-100",
  md: "max-w-130",
  lg: "max-w-170",
} as const;

type ContentProps = ComponentProps<typeof DialogPrimitive.Content>;

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** sm 400 · md 520 · lg 680 (always capped at the viewport minus 16px gutters). */
  size?: keyof typeof SIZE;
  /** "alertdialog" for confirmations (used by ConfirmationDialog). */
  role?: "dialog" | "alertdialog";
  /** Hide the top-right close button (confirmations close through their own buttons). */
  hideClose?: boolean;
  className?: string;
  onInteractOutside?: ContentProps["onInteractOutside"];
  onEscapeKeyDown?: ContentProps["onEscapeKeyDown"];
}

/**
 * Centered dialog: white surface, radius 24, frame shadow, padding 26, title 20/800 (design-system §6, §8).
 * The body scrolls when taller than the viewport; header and footer stay put.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  role = "dialog",
  hideClose = false,
  className,
  onInteractOutside,
  onEscapeKeyDown,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClass} />
        <DialogPrimitive.Content
          role={role}
          {...(description ? {} : { "aria-describedby": undefined })}
          onInteractOutside={onInteractOutside}
          onEscapeKeyDown={onEscapeKeyDown}
          className={cn(
            "fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[calc(100dvh-2rem)] -translate-y-1/2 flex-col",
            "rounded-6xl border border-frame bg-surface text-ink shadow-frame outline-none",
            "motion-safe:data-[state=open]:animate-modal-in motion-safe:data-[state=closed]:animate-modal-out",
            SIZE[size],
            className,
          )}
        >
          <div className="flex items-start gap-3 px-6.5 pt-6.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogPrimitive.Title className="text-title-md text-ink">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-body-sm font-normal text-ink-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            {!hideClose && (
              <DialogPrimitive.Close asChild>
                <IconButton label="Fechar" icon={X} size={34} className="-mt-1 -mr-1" />
              </DialogPrimitive.Close>
            )}
          </div>
          {children != null && <div className="min-h-0 flex-1 overflow-y-auto px-6.5 pt-5">{children}</div>}
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2.5 px-6.5 pt-6 pb-6.5">{footer}</div>
          ) : (
            <div aria-hidden="true" className="pb-6.5" />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
