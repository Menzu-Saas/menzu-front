"use client";

import { useState } from "react";
import { Button, FormField, Modal, Textarea } from "@/components/ui";

export interface CancelOrderDialogProps {
  /** Order being refused/cancelled; null closes the dialog. */
  order: { number: number; status: string } | null;
  onOpenChange: (open: boolean) => void;
  /** Rejects to keep the dialog open (the caller already showed the error). */
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Confirmation for "Recusar" / "Cancelar pedido" with a reason (stored in cancel_reason and the status
 * history). Same anatomy as ConfirmationDialog (alertdialog, outline + danger buttons, blocked while
 * pending) plus the reason field.
 */
export function CancelOrderDialog({ order, onOpenChange, onConfirm }: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const refusing = order?.status === "PENDING";

  function close(next: boolean) {
    if (pending) return;
    if (!next) setReason("");
    onOpenChange(next);
  }

  async function confirm() {
    setPending(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch {
      // Stay open so the user can retry.
    } finally {
      setPending(false);
    }
  }

  const block = (e: Event) => {
    if (pending) e.preventDefault();
  };

  return (
    <Modal
      open={order != null}
      onOpenChange={close}
      role="alertdialog"
      size="sm"
      hideClose
      onInteractOutside={block}
      onEscapeKeyDown={block}
      title={refusing ? `Recusar pedido #${order?.number ?? ""}?` : `Cancelar pedido #${order?.number ?? ""}?`}
      description="O cliente verá o pedido como cancelado. Estoque e cupom são devolvidos."
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={() => close(false)}>
            Voltar
          </Button>
          <Button variant="danger" loading={pending} onClick={confirm}>
            {refusing ? "Recusar pedido" : "Cancelar pedido"}
          </Button>
        </>
      }
    >
      <FormField label="Motivo" htmlFor="cancel-reason" hint="Opcional. Fica registrado no histórico do pedido.">
        <Textarea
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: produto em falta, fora da área de entrega…"
        />
      </FormField>
    </Modal>
  );
}
