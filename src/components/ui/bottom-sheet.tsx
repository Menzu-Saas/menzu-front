"use client";

import { useRef, type ReactNode } from "react";
import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { Modal, overlayClass, type ModalProps } from "./modal";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name; visually hidden when `hideTitle`. */
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  hideTitle?: boolean;
  className?: string;
}

/**
 * Mobile bottom sheet (vaul): top radius 24, grab handle, max height 92dvh, drag to dismiss,
 * scrollable body and a sticky footer with a top border.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  hideTitle = false,
  className,
}: BottomSheetProps) {
  const srOnlyTitle = hideTitle || title == null;
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    // autoFocus: vaul otherwise keeps focus on the trigger, now behind aria-hidden (keyboard and
    // screen-reader users would walk the hidden page). Radix then traps focus inside the sheet.
    <Vaul.Root open={open} onOpenChange={onOpenChange} autoFocus>
      <Vaul.Portal>
        <Vaul.Overlay className={overlayClass} />
        <Vaul.Content
          ref={contentRef}
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            // Focus the sheet itself (not its first control): no keyboard pop-up, no scroll jump,
            // and screen readers start at the title.
            event.preventDefault();
            contentRef.current?.focus({ preventScroll: true });
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-6xl border-t border-frame bg-surface text-ink shadow-frame outline-none",
            className,
          )}
        >
          <div aria-hidden="true" className="mx-auto mt-2.5 h-1.25 w-10 shrink-0 rounded-full bg-track-off" />
          <div className={cn("flex flex-col gap-1 px-5 pt-4", srOnlyTitle && "sr-only")}>
            <Vaul.Title className="text-title-sm text-ink">{title ?? "Detalhes"}</Vaul.Title>
            {description && (
              <Vaul.Description className="text-body-sm font-normal text-ink-muted">{description}</Vaul.Description>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">{children}</div>
          {footer && (
            <div className="flex flex-col gap-2.5 border-t border-line bg-surface px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

export type ResponsiveSheetProps = Omit<ModalProps, "role" | "hideClose" | "onInteractOutside" | "onEscapeKeyDown">;

/** Modal on ≥ md (768px), BottomSheet below. */
export function ResponsiveSheet({ size, className, ...props }: ResponsiveSheetProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  return desktop ? <Modal size={size} className={className} {...props} /> : <BottomSheet className={className} {...props} />;
}
