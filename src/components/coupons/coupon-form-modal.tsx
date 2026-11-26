"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, Input, Modal, SegmentedControl, Switch, notify } from "@/components/ui";
import { centsToInput, intOrNull, isoToLocalInput, localInputToIso } from "@/lib/form-values";
import { parseMoneyToCents } from "@/lib/money";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { couponSchema, normalizeCouponCode, type CouponInput } from "@/lib/schemas/coupon";
import type { CouponType } from "@/lib/types";
import { createCouponAction, updateCouponAction } from "@/server/actions/coupons";
import type { CouponRow } from "./types";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

interface FormState {
  code: string;
  description: string;
  type: CouponType;
  percent: string;
  amount: string;
  min_order: string;
  max_discount: string;
  starts_at: string;
  ends_at: string;
  usage_limit: string;
  per_customer_limit: string;
  is_active: boolean;
  is_public: boolean;
}

const TYPE_OPTIONS: { value: CouponType; label: string }[] = [
  { value: "PERCENT", label: "Percentual" },
  { value: "FIXED", label: "Valor fixo" },
];

function initialState(c: CouponRow | null, timeZone: string): FormState {
  return {
    code: c?.code ?? "",
    description: c?.description ?? "",
    type: c?.type ?? "PERCENT",
    percent: c?.type === "PERCENT" ? String(c.value) : "",
    amount: c?.type === "FIXED" ? centsToInput(c.value) : "",
    min_order: centsToInput(c?.min_order_cents),
    max_discount: centsToInput(c?.max_discount_cents),
    starts_at: isoToLocalInput(c?.starts_at, timeZone),
    ends_at: isoToLocalInput(c?.ends_at, timeZone),
    usage_limit: c?.usage_limit != null ? String(c.usage_limit) : "",
    per_customer_limit: c?.per_customer_limit != null ? String(c.per_customer_limit) : "",
    is_active: c?.is_active ?? true,
    is_public: c?.is_public ?? false,
  };
}

function toPayload(f: FormState, timeZone: string): CouponInput {
  return {
    code: f.code,
    description: f.description,
    type: f.type,
    value: f.type === "PERCENT" ? (intOrNull(f.percent) ?? Number.NaN) : parseMoneyToCents(f.amount),
    min_order_cents: parseMoneyToCents(f.min_order),
    max_discount_cents: f.type === "PERCENT" && f.max_discount.trim() ? parseMoneyToCents(f.max_discount) : null,
    starts_at: localInputToIso(f.starts_at, timeZone),
    ends_at: localInputToIso(f.ends_at, timeZone),
    usage_limit: intOrNull(f.usage_limit),
    per_customer_limit: intOrNull(f.per_customer_limit),
    is_active: f.is_active,
    is_public: f.is_public,
  };
}

const ERROR_KEY: Partial<Record<keyof FormState, string>> = {
  percent: "value",
  amount: "value",
  min_order: "min_order_cents",
  max_discount: "max_discount_cents",
};

/** Create/edit coupon modal. Validates with the shared schema in the browser; the server validates again. */
export function CouponFormModal({
  open,
  coupon,
  timeZone,
  canUseAdvanced,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  coupon: CouponRow | null;
  /** Restaurant IANA timezone: the date fields are wall-clock times there, whatever the browser's zone. */
  timeZone: string;
  canUseAdvanced: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (coupon: CouponRow) => void;
}) {
  const rid = useRestaurantId();
  const [form, setForm] = useState<FormState>(() => initialState(coupon, timeZone));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const editing = coupon != null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    const errorKey = ERROR_KEY[key] ?? key;
    setErrors((e) => (e[errorKey] ? { ...e, [errorKey]: "" } : e));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = toPayload(form, timeZone);
    const parsed = couponSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    startTransition(safely(async () => {
      const res = editing ? await updateCouponAction(rid, coupon.id, payload) : await createCouponAction(rid, payload);
      if (res.ok) {
        notify.success(editing ? `Cupom ${parsed.data.code} salvo` : `Cupom ${parsed.data.code} criado`);
        onOpenChange(false);
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) notify.error(res.error);
    }));
  }

  const percent = form.type === "PERCENT";
  const moneyField = (key: "amount" | "min_order" | "max_discount") => ({
    inputMode: "decimal" as const,
    placeholder: "0,00",
    value: form[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value.replace(/[^\d.,]/g, "")),
    onBlur: () => set(key, centsToInput(parseMoneyToCents(form[key]))),
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={editing ? `Editar cupom` : "Criar cupom"}
      description={editing ? "As alterações valem para os próximos pedidos." : "Defina o código, o desconto e as regras de uso."}
      size="lg"
      footer={
        <>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-danger"
              disabled={pending}
              onClick={() => onDelete(coupon)}
            >
              <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
              Excluir
            </Button>
          )}
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="coupon-form" loading={pending} className="font-extrabold">
            {editing ? "Salvar alterações" : "Criar cupom"}
          </Button>
        </>
      }
    >
      <form id="coupon-form" noValidate onSubmit={submit} className="grid gap-4.5 sm:grid-cols-2">
        <FormField label="Código" htmlFor="coupon-code" error={errors.code} hint="3 a 20 letras ou números" required>
          <Input
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="EX: BEMVINDO10"
            className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
            value={form.code}
            onChange={(e) => set("code", normalizeCouponCode(e.target.value))}
            maxLength={20}
          />
        </FormField>
        <FormField label="Descrição" htmlFor="coupon-description" error={errors.description} hint="Opcional, só para a equipe">
          <Input
            name="description"
            placeholder="Ex.: 10% na primeira compra"
            value={form.description}
            maxLength={120}
            onChange={(e) => set("description", e.target.value)}
          />
        </FormField>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <span id="coupon-type-label" className="text-body-sm font-bold text-ink">
            Tipo de desconto
          </span>
          <SegmentedControl
            aria-label="Tipo de desconto"
            block
            options={TYPE_OPTIONS.map((option) => ({
              ...option,
              disabled: !canUseAdvanced && coupon?.max_discount_cents != null && option.value === "FIXED",
            }))}
            value={form.type}
            onChange={(type) => {
              set("type", type);
              setErrors((e) => ({ ...e, value: "" }));
            }}
          />
        </div>

        {percent ? (
          <FormField label="Desconto (%)" htmlFor="coupon-value" error={errors.value} required>
            <Input
              name="percent"
              inputMode="numeric"
              placeholder="10"
              value={form.percent}
              onChange={(e) => set("percent", e.target.value.replace(/\D/g, "").slice(0, 3))}
              rightSlot={<span className="text-body-sm text-ink-faint">%</span>}
            />
          </FormField>
        ) : (
          <FormField label="Desconto (R$)" htmlFor="coupon-value" error={errors.value} required>
            <Input name="amount" {...moneyField("amount")} />
          </FormField>
        )}
        <FormField label="Pedido mínimo (R$)" htmlFor="coupon-min" error={errors.min_order_cents} hint="Vazio = sem mínimo">
          <Input name="min_order" {...moneyField("min_order")} />
        </FormField>
        {!canUseAdvanced && (
          <p className="text-caption text-ink-muted sm:col-span-2">
            Seu plano não inclui limites de uso ou desconto máximo. Você pode criar cupons sem essas regras.
            {editing && " Os valores avançados existentes serão mantidos; altere seu plano para modificá-los."}
          </p>
        )}
        {percent && (
          <FormField
            label="Desconto máximo (R$)"
            htmlFor="coupon-max"
            error={errors.max_discount_cents}
            hint="Teto do desconto em reais (opcional)"
            className="sm:col-span-2"
          >
            <Input name="max_discount" {...moneyField("max_discount")} disabled={!canUseAdvanced} />
          </FormField>
        )}

        <FormField label="Início" htmlFor="coupon-starts" error={errors.starts_at} hint="Vazio = vale a partir de agora">
          <Input
            name="starts_at"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set("starts_at", e.target.value)}
          />
        </FormField>
        <FormField label="Fim" htmlFor="coupon-ends" error={errors.ends_at} hint="Vazio = sem prazo">
          <Input name="ends_at" type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
        </FormField>

        <FormField label="Limite total de usos" htmlFor="coupon-limit" error={errors.usage_limit} hint="Vazio = ilimitado">
          <Input
            name="usage_limit"
            disabled={!canUseAdvanced}
            inputMode="numeric"
            placeholder="Ilimitado"
            value={form.usage_limit}
            onChange={(e) => set("usage_limit", e.target.value.replace(/\D/g, "").slice(0, 7))}
          />
        </FormField>
        <FormField
          label="Limite por cliente"
          htmlFor="coupon-per-customer"
          error={errors.per_customer_limit}
          hint="Pelo telefone do cliente"
        >
          <Input
            name="per_customer_limit"
            disabled={!canUseAdvanced}
            inputMode="numeric"
            placeholder="Ilimitado"
            value={form.per_customer_limit}
            onChange={(e) => set("per_customer_limit", e.target.value.replace(/\D/g, "").slice(0, 7))}
          />
        </FormField>

        <label
          htmlFor="coupon-active"
          className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-sunken px-3.5 py-3 sm:col-span-2"
        >
          <span className="flex flex-col">
            <span className="text-body text-ink">Cupom ativo</span>
            <span className="text-caption text-ink-muted">Desative para pausar a campanha sem perder o histórico.</span>
          </span>
          <Switch id="coupon-active" checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
        </label>
        <label
          htmlFor="coupon-public"
          className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-sunken px-3.5 py-3 sm:col-span-2"
        >
          <span className="flex flex-col">
            <span className="text-body text-ink">Mostrar no checkout</span>
            <span className="text-caption text-ink-muted">O cupom aparece na lista de cupons do cliente. Desligado, só quem sabe o código usa.</span>
          </span>
          <Switch id="coupon-public" checked={form.is_public} onCheckedChange={(v) => set("is_public", v)} />
        </label>
        {errors._form && <p className="text-caption font-semibold text-danger sm:col-span-2">{errors._form}</p>}
      </form>
    </Modal>
  );
}
