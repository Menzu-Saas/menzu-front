"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { FormField, Input, notify, SegmentedControl, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { parseMoneyToCents } from "@/lib/money";
import { onlyDigits } from "@/lib/phone";
import type { RestaurantStatus } from "@/lib/types";
import { setStatusAction, updateOperationAction } from "@/server/actions/settings";
import type { RestaurantSettings } from "@/server/queries/settings";
import { centsToInput, SaveButton, SettingsSection, SwitchRow, useSave } from "./shared";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

const STATUS_OPTIONS: { value: RestaurantStatus; label: string }[] = [
  { value: "OPEN", label: "Aberta" },
  { value: "PAUSED", label: "Pausada" },
  { value: "CLOSED", label: "Fechada" },
];

const STATUS_HINT: Record<RestaurantStatus, string> = {
  OPEN: "Recebendo pedidos dentro dos horários de funcionamento.",
  PAUSED: "Cardápio visível, mas sem novos pedidos por enquanto.",
  CLOSED: "Loja fechada: o cardápio não aceita pedidos.",
};

const TOGGLES = [
  { key: "accepts_delivery", label: "Entrega própria", hint: "Taxas por bairro em Entrega" },
  { key: "accepts_pickup", label: "Retirada no balcão" },
  { key: "accepts_dine_in", label: "Consumo no local", hint: "Pedidos pela mesa, via QR Code" },
  { key: "accepts_scheduling", label: "Agendamento de pedidos" },
] as const;

export function OperationForm({ restaurant }: { restaurant: RestaurantSettings }) {
  const rid = useRestaurantId();
  const router = useRouter();
  const initial = {
    min_order: centsToInput(restaurant.min_order_cents),
    avg_prep: String(restaurant.avg_prep_minutes),
    delivery_fee: centsToInput(restaurant.default_delivery_fee_cents),
    accepts_delivery: restaurant.accepts_delivery,
    accepts_pickup: restaurant.accepts_pickup,
    accepts_dine_in: restaurant.accepts_dine_in,
    accepts_scheduling: restaurant.accepts_scheduling,
  };
  const [form, setForm] = useState(initial);
  const [status, setOptimisticStatus] = useOptimistic(restaurant.status);
  const [statusPending, startStatus] = useTransition();
  const { pending, errors, save, clear } = useSave();
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K], errorKey: string = key) {
    setForm((f) => ({ ...f, [key]: value }));
    clear(errorKey);
  }

  function changeStatus(next: RestaurantStatus) {
    startStatus(safely(async () => {
      setOptimisticStatus(next);
      const result = await setStatusAction(rid, next);
      if (result.ok) {
        notify.success(`Loja ${STATUS_OPTIONS.find((o) => o.value === next)?.label.toLowerCase()}.`);
        router.refresh();
      } else notify.error(result.error ?? "Não foi possível mudar o status.");
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(
      () =>
        updateOperationAction(rid, {
          min_order_cents: parseMoneyToCents(form.min_order),
          avg_prep_minutes: form.avg_prep.trim() === "" ? Number.NaN : Number(form.avg_prep),
          default_delivery_fee_cents: parseMoneyToCents(form.delivery_fee),
          accepts_delivery: form.accepts_delivery,
          accepts_pickup: form.accepts_pickup,
          accepts_dine_in: form.accepts_dine_in,
          accepts_scheduling: form.accepts_scheduling,
        }),
      "Operação salva.",
    );
  }

  return (
    <SettingsSection id="operacao" title="Operação">
      <div className={cn("flex flex-col gap-2", statusPending && "opacity-80")}>
        <p className="text-body-sm font-bold text-ink">Status da loja</p>
        <SegmentedControl aria-label="Status da loja" block options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
        <p className="text-caption text-ink-muted">{STATUS_HINT[status]}</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5 border-t border-line pt-5">
        <div className="grid gap-4.5 sm:grid-cols-3">
          <FormField label="Pedido mínimo (R$)" htmlFor="op-min" error={errors.min_order_cents} hint="0 = sem mínimo">
            <Input
              inputMode="decimal"
              placeholder="0,00"
              value={form.min_order}
              onChange={(e) => set("min_order", e.target.value.replace(/[^\d.,]/g, ""), "min_order_cents")}
              onBlur={() => set("min_order", centsToInput(parseMoneyToCents(form.min_order)), "min_order_cents")}
            />
          </FormField>
          <FormField label="Tempo médio (min)" htmlFor="op-prep" error={errors.avg_prep_minutes}>
            <Input
              inputMode="numeric"
              placeholder="30"
              value={form.avg_prep}
              onChange={(e) => set("avg_prep", onlyDigits(e.target.value).slice(0, 3), "avg_prep_minutes")}
            />
          </FormField>
          <FormField label="Taxa padrão (R$)" htmlFor="op-fee" error={errors.default_delivery_fee_cents} hint="Sem zona cadastrada">
            <Input
              inputMode="decimal"
              placeholder="0,00"
              value={form.delivery_fee}
              onChange={(e) => set("delivery_fee", e.target.value.replace(/[^\d.,]/g, ""), "default_delivery_fee_cents")}
              onBlur={() => set("delivery_fee", centsToInput(parseMoneyToCents(form.delivery_fee)), "default_delivery_fee_cents")}
            />
          </FormField>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-body-sm font-extrabold tracking-wider uppercase text-ink-faint">Entrega e atendimento</p>
          {TOGGLES.map((t) => (
            <SwitchRow
              key={t.key}
              id={`op-${t.key}`}
              label={t.label}
              hint={"hint" in t ? t.hint : undefined}
              control={
                <Switch
                  id={`op-${t.key}`}
                  checked={form[t.key]}
                  onCheckedChange={(v) => set(t.key, v, t.key === "accepts_scheduling" ? t.key : "accepts_delivery")}
                />
              }
            />
          ))}
          {errors.accepts_delivery && (
            <p role="alert" className="text-caption font-semibold text-danger">
              {errors.accepts_delivery}
            </p>
          )}
        </div>
        <SaveButton pending={pending} dirty={dirty} />
      </form>
    </SettingsSection>
  );
}
