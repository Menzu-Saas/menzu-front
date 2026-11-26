"use client";

import { TriangleAlert } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, Icon, Input, Modal, notify } from "@/components/ui";
import { deleteRestaurantAction } from "@/server/actions/settings";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

/** OWNER only: deletes the restaurant after the slug is typed back (delete_restaurant re-checks OWNER). */
export function DangerZone({ slug, name }: { slug: string; name: string }) {
  const rid = useRestaurantId();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const matches = confirm.trim().toLowerCase() === slug.toLowerCase();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches) return;
    startTransition(safely(async () => {
      const result = await deleteRestaurantAction(rid, confirm);
      if (result && !result.ok) {
        setError(result.fieldErrors?.confirm ?? result.error);
        notify.error(result.error ?? "Não foi possível excluir o restaurante.");
      }
    }));
  }

  return (
    <section
      aria-labelledby="perigo-title"
      className="flex flex-col gap-4 rounded-4xl border border-danger-soft bg-surface p-5 sm:p-6.5 xl:col-span-2"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <Icon icon={TriangleAlert} size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="perigo-title" className="text-body-sm font-extrabold tracking-wider uppercase text-danger">
            Zona de perigo
          </h2>
          <p className="text-body-sm font-normal text-ink-muted">
            Excluir o restaurante apaga cardápio, pedidos, clientes, cupons e equipe. Não dá para desfazer.
          </p>
        </div>
      </div>
      <Button
        variant="danger"
        size="md"
        className="self-start"
        onClick={() => {
          setConfirm("");
          setError(undefined);
          setOpen(true);
        }}
      >
        Excluir restaurante
      </Button>
      <Modal
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        role="alertdialog"
        size="sm"
        title={`Excluir ${name}?`}
        description="Todos os dados do restaurante serão apagados permanentemente."
        footer={
          <>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="delete-restaurant-form" variant="danger" loading={pending} disabled={!matches}>
              Excluir para sempre
            </Button>
          </>
        }
      >
        <form id="delete-restaurant-form" noValidate onSubmit={submit}>
          <FormField
            label={
              <>
                Digite <span className="font-mono text-ink">{slug}</span> para confirmar
              </>
            }
            htmlFor="delete-confirm"
            error={error}
          >
            <Input
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(undefined);
              }}
            />
          </FormField>
        </form>
      </Modal>
    </section>
  );
}
