"use client";

import { Pencil, Plus, Printer, Trash2, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  Button,
  ConfirmationDialog,
  EmptyState,
  FormField,
  Icon,
  IconButton,
  Input,
  Modal,
  notify,
} from "@/components/ui";
import { onlyDigits } from "@/lib/phone";
import { displayUrl } from "@/lib/qr";
import type { FieldErrors } from "@/lib/schemas/auth";
import { addTableAction, removeTableAction, updateTableAction } from "@/server/actions/tables";
import { QrActions } from "./qr-actions";
import { QrImage } from "./qr-image";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

export interface TableQr {
  id: string;
  number: number;
  label: string | null;
  url: string;
  svg: string;
}

interface Editing {
  id: string | null;
  number: string;
  label: string;
}

/** Mesas: add / rename / remove tables and their QR cards (`/cardapio/{slug}?table={n}`). */
export function TablesManager({ tables, slug, acceptsDineIn }: { tables: TableQr[]; slug: string; acceptsDineIn: boolean }) {
  const rid = useRestaurantId();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [removing, setRemoving] = useState<TableQr | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const nextNumber = tables.reduce((max, t) => Math.max(max, t.number), 0) + 1;

  function openNew() {
    setErrors({});
    setEditing({ id: null, number: String(nextNumber), label: "" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const input = { number: editing.number ? Number(editing.number) : Number.NaN, label: editing.label };
    startTransition(safely(async () => {
      const result = editing.id ? await updateTableAction(rid, editing.id, input) : await addTableAction(rid, input);
      if (result.ok) {
        notify.success(editing.id ? "Mesa atualizada." : `Mesa ${input.number} adicionada.`);
        setEditing(null);
        router.refresh();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      if (result.error) notify.error(result.error);
    }));
  }

  return (
    <section aria-labelledby="tables-title" className="flex flex-col gap-4 rounded-4xl border border-line bg-surface p-5 sm:p-6.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="tables-title" className="text-item font-extrabold text-ink">
            Mesas
          </h2>
          <p className="text-caption text-ink-muted">
            {tables.length} {tables.length === 1 ? "mesa" : "mesas"} · cada QR abre o cardápio já com a mesa escolhida.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="md" onClick={openNew}>
            <Icon icon={Plus} size={18} />
            Adicionar mesa
          </Button>
          {tables.length > 0 && (
            <Button asChild variant="inverse" size="md">
              <a href="/painel/qrcodes/imprimir">
                <Icon icon={Printer} size={18} />
                Imprimir todos
              </a>
            </Button>
          )}
        </div>
      </div>

      {!acceptsDineIn && tables.length > 0 && (
        <p className="rounded-xl border border-line bg-surface-sunken px-3.5 py-3 text-body-sm text-ink-secondary">
          “Consumo no local” está desligado em Configurações: os QR das mesas abrem o cardápio sem o modo mesa.
        </p>
      )}

      {tables.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nenhuma mesa cadastrada"
          description="Cadastre as mesas para imprimir um QR Code em cada uma."
          action={
            <Button size="md" onClick={openNew}>
              <Icon icon={Plus} size={18} />
              Adicionar mesa
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {tables.map((t) => (
            <li key={t.id} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-subheading text-ink">Mesa {t.number}</p>
                  <p className="truncate text-caption text-ink-muted">{t.label && t.label !== `Mesa ${t.number}` ? t.label : "Sem apelido"}</p>
                </div>
                <div className="flex gap-1.5">
                  <IconButton
                    label={`Editar mesa ${t.number}`}
                    icon={Pencil}
                    size={34}
                    variant="outline"
                    onClick={() => {
                      setErrors({});
                      setEditing({ id: t.id, number: String(t.number), label: t.label ?? "" });
                    }}
                  />
                  <IconButton
                    label={`Remover mesa ${t.number}`}
                    icon={Trash2}
                    size={34}
                    variant="outline"
                    className="text-danger"
                    onClick={() => setRemoving(t)}
                  />
                </div>
              </div>
              <div className="mx-auto w-full max-w-44 rounded-2xl border border-line bg-surface p-2">
                <QrImage svg={t.svg} label={`QR Code da mesa ${t.number}`} />
              </div>
              <p className="truncate text-center font-mono text-caption text-ink-secondary" title={t.url}>
                {displayUrl(t.url)}
              </p>
              <QrActions
                url={t.url}
                svg={t.svg}
                filename={`mesa-${t.number}-${slug}`}
                printHref={`/painel/qrcodes/imprimir?mesa=${t.number}`}
                compact
              />
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing != null}
        onOpenChange={(open) => !open && !pending && setEditing(null)}
        size="sm"
        title={editing?.id ? "Editar mesa" : "Adicionar mesa"}
        description={editing?.id ? "Mudar o número troca o QR Code: imprima de novo." : "O QR Code é gerado na hora."}
        footer={
          <>
            <Button variant="outline" disabled={pending} onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="table-form" variant="inverse" loading={pending}>
              {editing?.id ? "Salvar" : "Adicionar"}
            </Button>
          </>
        }
      >
        {editing && (
          <form id="table-form" noValidate onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3.5">
            <FormField label="Número" htmlFor="table-number" error={errors.number} required>
              <Input
                inputMode="numeric"
                value={editing.number}
                onChange={(e) => setEditing({ ...editing, number: onlyDigits(e.target.value).slice(0, 4) })}
              />
            </FormField>
            <FormField label="Apelido" htmlFor="table-label" error={errors.label}>
              <Input
                placeholder="Varanda, Salão 2…"
                maxLength={40}
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmationDialog
        open={removing != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remover a mesa ${removing?.number ?? ""}?`}
        description="O QR Code impresso desta mesa deixa de abrir o modo mesa."
        confirmLabel="Remover"
        tone="danger"
        onConfirm={async () => {
          if (!removing) return;
          const result = await removeTableAction(rid, removing.id);
          if (!result.ok) {
            notify.error(result.error ?? "Não foi possível remover a mesa.");
            throw new Error("remove failed");
          }
          notify.success(`Mesa ${removing.number} removida.`);
          router.refresh();
        }}
      />
    </section>
  );
}
