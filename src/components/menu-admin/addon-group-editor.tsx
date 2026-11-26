"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, IconButton, Input, Modal, notify, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { addonGroupSchema, type AddonGroupInput } from "@/lib/schemas/menu";
import { saveAddonGroupAction } from "@/server/actions/menu";
import type { AddonGroupRow } from "@/server/queries/menu";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

interface OptionRow {
  key: string;
  id?: string;
  name: string;
  price: string;
  max_quantity: string;
  is_available: boolean;
}

const centsText = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const newKey = () => `new-${crypto.randomUUID()}`;

export interface AddonGroupEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create. */
  group: AddonGroupRow | null;
}

/** Modal editor for an addon group: nome, obrigatório, mín/máx and its options. */
export function AddonGroupEditor({ open, onOpenChange, group }: AddonGroupEditorProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={group ? "Editar grupo" : "Novo grupo de complementos"}
      description={
        group
          ? group.products === 1
            ? "Usado em 1 item. As mudanças valem para ele."
            : `Usado em ${group.products} itens. As mudanças valem para todos.`
          : "Ex.: Adicionais, Molhos, Ponto da carne."
      }
      size="lg"
    >
      <EditorForm group={group} onClose={() => onOpenChange(false)} />
    </Modal>
  );
}

function EditorForm({ group, onClose }: { group: AddonGroupRow | null; onClose: () => void }) {
  const rid = useRestaurantId();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [name, setName] = useState(group?.name ?? "");
  const [required, setRequired] = useState(group?.is_required ?? false);
  const [min, setMin] = useState(String(group?.min_select ?? 0));
  const [max, setMax] = useState(String(group?.max_select ?? 1));
  const [options, setOptions] = useState<OptionRow[]>(() =>
    group?.options.length
      ? group.options.map((o) => ({
          key: o.id,
          id: o.id,
          name: o.name,
          price: centsText(o.price_cents),
          max_quantity: String(o.max_quantity),
          is_available: o.is_available,
        }))
      : [{ key: "first", name: "", price: "0,00", max_quantity: "1", is_available: true }],
  );

  function update(key: string, patch: Partial<OptionRow>) {
    setOptions((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function move(index: number, delta: number) {
    setOptions((rows) => {
      const target = index + delta;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const input: AddonGroupInput = {
      name,
      is_required: required,
      min_select: min,
      max_select: max,
      options: options.map((o) => ({
        id: o.id,
        name: o.name,
        price: o.price,
        max_quantity: o.max_quantity,
        is_available: o.is_available,
      })),
    };
    const local = addonGroupSchema.safeParse(input);
    if (!local.success) {
      setErrors(fieldErrors(local.error));
      return;
    }
    setErrors({});
    startTransition(safely(async () => {
      const res = await saveAddonGroupAction(rid, group?.id ?? null, input);
      if (!res.ok) {
        setErrors({ ...(res.fieldErrors ?? {}), ...(res.error ? { _form: res.error } : {}) });
        return;
      }
      notify.success(group ? "Grupo atualizado" : "Grupo criado");
      onClose();
    }));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4.5">
      <FormField label="Nome do grupo" htmlFor="addon-group-name" error={errors.name} required>
        <Input autoFocus value={name} maxLength={80} placeholder="Ex.: Adicionais" onChange={(e) => setName(e.target.value)} />
      </FormField>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-subtle px-3.5 py-3">
        <label htmlFor="addon-group-required" className="flex flex-col gap-0.5">
          <span className="text-body text-ink">Obrigatório</span>
          <span className="text-caption text-ink-muted">O cliente precisa escolher pelo menos o mínimo.</span>
        </label>
        <Switch
          id="addon-group-required"
          checked={required}
          onCheckedChange={(v) => {
            setRequired(v);
            if (v && Number(min) < 1) setMin("1");
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Mínimo" htmlFor="addon-group-min" error={errors.min_select}>
          <Input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
        </FormField>
        <FormField label="Máximo" htmlFor="addon-group-max" error={errors.max_select}>
          <Input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} />
        </FormField>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-body-sm font-bold text-ink">Opções</span>
          {errors.options && (
            <span role="alert" className="text-caption font-semibold text-danger">
              {errors.options}
            </span>
          )}
        </div>
        <ol className="flex flex-col gap-2.5">
          {options.map((o, i) => (
            <li
              key={o.key}
              className={cn(
                "flex flex-wrap items-start gap-2.5 rounded-xl border border-line p-3",
                o.is_available ? "bg-surface" : "bg-surface-sunken",
              )}
            >
              <FormField
                label="Nome"
                htmlFor={`opt-${o.key}-name`}
                error={errors[`options.${i}.name`]}
                className="min-w-0 flex-[2_1_10rem]"
              >
                <Input value={o.name} maxLength={80} placeholder="Ex.: Bacon" onChange={(e) => update(o.key, { name: e.target.value })} />
              </FormField>
              <FormField
                label="Preço (R$)"
                htmlFor={`opt-${o.key}-price`}
                error={errors[`options.${i}.price`]}
                className="min-w-0 flex-[1_1_6rem]"
              >
                <Input inputMode="decimal" value={o.price} onChange={(e) => update(o.key, { price: e.target.value })} />
              </FormField>
              <FormField
                label="Qtd. máx."
                htmlFor={`opt-${o.key}-qty`}
                error={errors[`options.${i}.max_quantity`]}
                className="min-w-0 flex-[1_1_5rem]"
              >
                <Input inputMode="numeric" value={o.max_quantity} onChange={(e) => update(o.key, { max_quantity: e.target.value })} />
              </FormField>
              <div className="flex w-full items-center justify-between gap-2 pt-1 sm:w-auto sm:flex-col sm:items-end sm:pt-0">
                <label className="flex items-center gap-2 text-caption font-semibold text-ink-secondary">
                  <Switch
                    checked={o.is_available}
                    onCheckedChange={(v) => update(o.key, { is_available: v })}
                    aria-label={`${o.name || "Opção"} disponível`}
                  />
                  {o.is_available ? "Disponível" : "Esgotado"}
                </label>
                <div className="flex items-center gap-1.5">
                  <IconButton label="Mover para cima" icon={ArrowUp} size={34} variant="outline" disabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton
                    label="Mover para baixo"
                    icon={ArrowDown}
                    size={34}
                    variant="outline"
                    disabled={i === options.length - 1}
                    onClick={() => move(i, 1)}
                  />
                  <IconButton
                    label="Remover opção"
                    icon={X}
                    size={34}
                    variant="outline"
                    className="text-danger"
                    disabled={options.length === 1}
                    onClick={() => setOptions((rows) => rows.filter((r) => r.key !== o.key))}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() =>
            setOptions((rows) => [...rows, { key: newKey(), name: "", price: "0,00", max_quantity: "1", is_available: true }])
          }
          className={cn(
            "rounded-lg border border-dashed border-line-strong px-3.5 py-2.75 text-body-sm font-bold text-ink-muted",
            "transition-[border-color,background-color,color] duration-150 ease-out hover:border-brand-tint-border hover:bg-brand-tint hover:text-brand",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          + Adicional
        </button>
      </div>

      {errors._form && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {errors._form}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
        <Button variant="outline" disabled={pending} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {group ? "Salvar grupo" : "Criar grupo"}
        </Button>
      </div>
    </form>
  );
}
