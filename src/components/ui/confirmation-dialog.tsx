"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<void> | void;
}

/**
 * Confirmation (alertdialog) built on Modal. While `onConfirm` runs the confirm button shows a spinner and
 * cancel / Escape / outside click are blocked; it closes on success and stays open on error
 * (the caller reports the error, e.g. with `notify.error`).
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "primary",
  onConfirm,
}: ConfirmationDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Stay open so the user can retry; the caller surfaces the error.
    } finally {
      setPending(false);
    }
  }

  const blockWhilePending = (event: Event) => {
    if (pending) event.preventDefault();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title={title}
      description={description}
      size="sm"
      role="alertdialog"
      hideClose
      onInteractOutside={blockWhilePending}
      onEscapeKeyDown={blockWhilePending}
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={pending} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
