"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, Input, Modal, SegmentedControl, Switch, notify } from "@/components/ui";
import { centsToInput, intOrNull } from "@/lib/form-values";
import { parseMoneyToCents } from "@/lib/money";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { maskCep, zoneSchema, type ZoneInput } from "@/lib/schemas/zone";
import { createZoneAction, updateZoneAction } from "@/server/actions/zones";
import { TagInput } from "./tag-input";
import type { ZoneRow } from "./types";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

type ZoneKind = "NEIGHBORHOOD" | "CEP_RANGE" | "DISTANCE";

interface FormState {
  name: string;
  type: "NEIGHBORHOOD" | "CEP_RANGE";
  neighborhoods: string[];
  city: string;
  state: string;
  cep_start: string;
  cep_end: string;
  fee: string;
  min_order: string;
  est_minutes: string;
  is_active: boolean;
}

const TYPE_OPTIONS: { value: ZoneKind; label: string; disabled?: boolean }[] = [
  { value: "NEIGHBORHOOD", label: "Bairros" },
  { value: "CEP_RANGE", label: "CEP" },
  { value: "DISTANCE", label: "Distância", disabled: true },
];

function initialState(z: ZoneRow | null): FormState {
  return {
    name: z?.name ?? "",
    type: z?.type === "CEP_RANGE" ? "CEP_RANGE" : "NEIGHBORHOOD",
    neighborhoods: z?.neighborhoods ?? [],
    city: z?.city ?? "",
    state: z?.state ?? "",
    cep_start: z?.cep_start ?? "",
    cep_end: z?.cep_end ?? "",
    fee: z ? centsToInput(z.fee_cents) : "",
    min_order: centsToInput(z?.min_order_cents),
    est_minutes: z?.est_minutes != null ? String(z.est_minutes) : "",
    is_active: z?.is_active ?? true,
  };
}

function toPayload(f: FormState): ZoneInput {
  return {
    name: f.name,
    type: f.type,
    neighborhoods: f.neighborhoods,
    city: f.city,
    state: f.state,
    cep_start: f.cep_start,
    cep_end: f.cep_end,
    fee_cents: parseMoneyToCents(f.fee),
    min_order_cents: f.min_order.trim() ? parseMoneyToCents(f.min_order) : null,
    est_minutes: intOrNull(f.est_minutes),
    is_active: f.is_active,
  };
}

const ERROR_KEY: Partial<Record<keyof FormState, string>> = { fee: "fee_cents", min_order: "min_order_cents" };

/** Create/edit delivery zone. Same schema in the browser and on the server. */
export function ZoneFormModal({
  open,
  zone,
  onOpenChange,
}: {
  open: boolean;
  zone: ZoneRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const rid = useRestaurantId();
  const [form, setForm] = useState<FormState>(() => initialState(zone));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const editing = zone != null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    const errorKey = ERROR_KEY[key] ?? key;
    setErrors((e) => (e[errorKey] ? { ...e, [errorKey]: "" } : e));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = toPayload(form);
    const parsed = zoneSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    startTransition(safely(async () => {
      const res = editing ? await updateZoneAction(rid, zone.id, payload) : await createZoneAction(rid, payload);
      if (res.ok) {
        notify.success(editing ? `Zona ${parsed.data.name} salva` : `Zona ${parsed.data.name} criada`);
        onOpenChange(false);
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) notify.error(res.error);
    }));
  }

  const moneyField = (key: "fee" | "min_order") => ({
    inputMode: "decimal" as const,
    placeholder: "0,00",
    value: form[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value.replace(/[^\d.,]/g, "")),
    onBlur: () => set(key, form[key].trim() ? centsToInput(parseMoneyToCents(form[key])) || "0,00" : ""),
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={editing ? "Editar zona" : "Nova zona de entrega"}
      description="Endereços dentro da zona pagam a taxa definida aqui."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="zone-form" loading={pending} className="font-extrabold">
            {editing ? "Salvar alterações" : "Criar zona"}
          </Button>
        </>
      }
    >
      <form id="zone-form" noValidate onSubmit={submit} className="grid gap-4.5 sm:grid-cols-2">
        <FormField label="Nome da zona" htmlFor="zone-name" error={errors.name} required className="sm:col-span-2">
          <Input
            name="name"
            placeholder="Ex.: Pinheiros e região"
            maxLength={80}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormField>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-body-sm font-bold text-ink">Como a zona é definida</span>
          <SegmentedControl<ZoneKind>
            aria-label="Como a zona é definida"
            block
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(type) => type !== "DISTANCE" && set("type", type)}
          />
          <p className="text-caption text-ink-muted">Distância: em breve.</p>
        </div>

        {form.type === "NEIGHBORHOOD" ? (
          <>
          <FormField label="Município" htmlFor="zone-city" error={errors.city} hint="Confirme o município dos bairros atendidos.">
            <Input name="city" value={form.city} maxLength={120} onChange={(e) => set("city", e.target.value)} />
          </FormField>
          <FormField label="UF" htmlFor="zone-state" error={errors.state}>
            <Input name="state" value={form.state} maxLength={2} placeholder="SP" onChange={(e) => set("state", e.target.value.toUpperCase())} />
          </FormField>
          <FormField
            label="Bairros"
            htmlFor="zone-neighborhoods"
            error={errors.neighborhoods}
            hint="Digite e pressione Enter (ou vírgula) para adicionar."
            required
            className="sm:col-span-2"
          >
            <TagInput
              value={form.neighborhoods}
              onChange={(tags) => set("neighborhoods", tags)}
              placeholder="Ex.: Pinheiros, Vila Madalena"
            />
          </FormField>
          </>
        ) : (
          <>
            <FormField label="CEP inicial" htmlFor="zone-cep-start" error={errors.cep_start} required>
              <Input
                name="cep_start"
                inputMode="numeric"
                placeholder="00000-000"
                className="tabular-nums"
                value={form.cep_start}
                onChange={(e) => set("cep_start", maskCep(e.target.value))}
              />
            </FormField>
            <FormField label="CEP final" htmlFor="zone-cep-end" error={errors.cep_end} required>
              <Input
                name="cep_end"
                inputMode="numeric"
                placeholder="00000-000"
                className="tabular-nums"
                value={form.cep_end}
                onChange={(e) => set("cep_end", maskCep(e.target.value))}
              />
            </FormField>
          </>
        )}

        <FormField label="Taxa de entrega (R$)" htmlFor="zone-fee" error={errors.fee_cents} hint="0,00 = grátis" required>
          <Input name="fee" {...moneyField("fee")} />
        </FormField>
        <FormField label="Pedido mínimo (R$)" htmlFor="zone-min" error={errors.min_order_cents} hint="Vazio = usa o mínimo da loja">
          <Input name="min_order" {...moneyField("min_order")} />
        </FormField>
        <FormField label="Tempo estimado (min)" htmlFor="zone-minutes" error={errors.est_minutes} hint="Ex.: 40">
          <Input
            name="est_minutes"
            inputMode="numeric"
            placeholder="40"
            value={form.est_minutes}
            onChange={(e) => set("est_minutes", e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        </FormField>

        <label
          htmlFor="zone-active"
          className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-sunken px-3.5 py-3 sm:self-end"
        >
          <span className="text-body text-ink">Zona ativa</span>
          <Switch id="zone-active" checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
        </label>
      </form>
    </Modal>
  );
}
