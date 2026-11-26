"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";
import { Button, FormField, Input, notify } from "@/components/ui";
import type { FieldErrors } from "@/lib/schemas/auth";
import type { SubscribeInput } from "@/lib/schemas/subscription";
import { subscribePlanAction } from "@/server/actions/subscription";

/** Billing details for the monthly plan. They go to Asaas, which shows the invoice (Pix, boleto or card). */
export function SubscribeForm({ planSlug, planName, priceLabel }: { planSlug: string; planName: string; priceLabel: string }) {
  const rid = useRestaurantId();
  const [form, setForm] = useState({ name: "", email: "", cpfCnpj: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState<{ invoice: string | null } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload: SubscribeInput = { planSlug, ...form };
    setErrors({});
    startTransition(safely(async () => {
      const res = await subscribePlanAction(rid, payload);
      if (res.ok) {
        setDone({ invoice: res.invoiceUrl });
        notify.success(`Assinatura do plano ${planName} criada`);
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) { setErrors((e) => ({ ...e, _form: res.error! })); notify.error(res.error); }
    }));
  }

  if (done) {
    return <div className="flex flex-col gap-3">
      <p className="text-body-sm text-ink-secondary">Assinatura criada. O plano {planName} é liberado assim que o primeiro pagamento for confirmado.</p>
      {done.invoice ? <a href={done.invoice} rel="noreferrer noopener" className="flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 font-bold text-white">Pagar {priceLabel} no Asaas</a>
        : <p className="text-caption text-ink-muted">A cobrança está sendo gerada. Atualize a página em instantes para ver o link de pagamento.</p>}
    </div>;
  }

  return <form noValidate onSubmit={submit} className="grid gap-3" aria-label={`Assinar o plano ${planName}`}>
    <FormField label="Nome ou razão social" htmlFor={`sub-name-${planSlug}`} error={errors.name} required>
      <Input value={form.name} maxLength={100} autoComplete="organization" disabled={pending} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
    </FormField>
    <FormField label="CPF ou CNPJ" htmlFor={`sub-doc-${planSlug}`} error={errors.cpfCnpj} required>
      <Input value={form.cpfCnpj} maxLength={18} inputMode="numeric" disabled={pending} onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: e.target.value }))} />
    </FormField>
    <FormField label="E-mail para a cobrança" htmlFor={`sub-email-${planSlug}`} error={errors.email} required>
      <Input value={form.email} maxLength={120} inputMode="email" autoComplete="email" disabled={pending} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
    </FormField>
    {errors._form && <p role="alert" className="text-caption font-semibold text-danger">{errors._form}</p>}
    <Button type="submit" loading={pending}>Assinar por {priceLabel}/mês</Button>
    <p className="text-caption text-ink-muted">Você paga por Pix, boleto ou cartão na página segura do Asaas. Os dados de cobrança não ficam salvos no Menzu.</p>
  </form>;
}

