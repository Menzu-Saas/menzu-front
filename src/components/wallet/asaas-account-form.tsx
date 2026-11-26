"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";
import { Button, FormField, Input, notify } from "@/components/ui";
import { centsToInput } from "@/lib/form-values";
import { parseMoneyToCents } from "@/lib/money";
import { COMPANY_TYPE_LABEL, asaasAccountSchema, type AsaasAccountInput } from "@/lib/schemas/asaas-account";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { createAsaasAccountAction } from "@/server/actions/asaas-account";

type FormState = {
  name: string; email: string; cpfCnpj: string; mobilePhone: string; income: string;
  postalCode: string; address: string; addressNumber: string; province: string;
  birthDate: string; companyType: string;
};

const EMPTY: FormState = {
  name: "", email: "", cpfCnpj: "", mobilePhone: "", income: "", postalCode: "", address: "",
  addressNumber: "", province: "", birthDate: "", companyType: "",
};

const toPayload = (f: FormState): AsaasAccountInput => ({
  name: f.name, email: f.email, cpfCnpj: f.cpfCnpj, mobilePhone: f.mobilePhone,
  incomeCents: parseMoneyToCents(f.income), postalCode: f.postalCode, address: f.address,
  addressNumber: f.addressNumber, province: f.province, birthDate: f.birthDate,
  companyType: f.companyType as AsaasAccountInput["companyType"],
});

const ERROR_KEY: Partial<Record<keyof FormState, string>> = { income: "incomeCents" };

/** OWNER-only form that creates the restaurant's Asaas account. Identity data go to Asaas, not to Menzu. */
export function AsaasAccountForm() {
  const rid = useRestaurantId();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const isCompany = form.cpfCnpj.replace(/\D/g, "").length === 14;
  const isPerson = form.cpfCnpj.replace(/\D/g, "").length === 11;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    const errorKey = ERROR_KEY[key] ?? key;
    setErrors((e) => (e[errorKey] ? { ...e, [errorKey]: "" } : e));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = toPayload(form);
    const parsed = asaasAccountSchema.safeParse(payload);
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({});
    startTransition(safely(async () => {
      const res = await createAsaasAccountAction(rid, payload);
      if (res.ok) {
        notify.success(res.pixReady ? "Conta de pagamentos criada, com Pix ativo" : "Conta de pagamentos criada. O Pix ainda não está ativo: use Ativar Pix.");
        setForm(EMPTY);
        router.refresh();
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) { setErrors((e) => ({ ...e, _form: res.error! })); notify.error(res.error); }
    }));
  }

  const text = (key: keyof FormState, props: { inputMode?: "numeric" | "tel" | "email" | "decimal"; autoComplete?: string; placeholder?: string; maxLength?: number } = {}) => ({
    name: key, value: form[key], disabled: pending, ...props,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });

  return (
    <form noValidate onSubmit={submit} className="grid gap-4.5 sm:grid-cols-2" aria-label="Criar conta de pagamentos">
      <p className="text-body-sm text-ink-muted sm:col-span-2">
        Informe os dados do titular que vai receber os pagamentos online. Eles são enviados ao Asaas para abrir a conta
        e <strong>não ficam salvos no Menzu</strong>. O Menzu retém 3,5% de cada pagamento online.
      </p>
      <FormField label="Nome ou razão social" htmlFor="asaas-name" error={errors.name} required className="sm:col-span-2">
        <Input {...text("name", { autoComplete: "organization", maxLength: 100 })} />
      </FormField>
      <FormField label="CPF ou CNPJ" htmlFor="asaas-doc" error={errors.cpfCnpj} required>
        <Input {...text("cpfCnpj", { inputMode: "numeric", placeholder: "Somente números", maxLength: 18 })} />
      </FormField>
      <FormField label="Telefone com DDD" htmlFor="asaas-phone" error={errors.mobilePhone} required>
        <Input {...text("mobilePhone", { inputMode: "tel", autoComplete: "tel-national", maxLength: 16 })} />
      </FormField>
      <FormField label="E-mail" htmlFor="asaas-email" error={errors.email} required>
        <Input {...text("email", { inputMode: "email", autoComplete: "email", maxLength: 120 })} />
      </FormField>
      <FormField label="Faturamento mensal (R$)" htmlFor="asaas-income" error={errors.incomeCents} hint="Estimativa; o Asaas usa na análise da conta" required>
        <Input
          {...text("income", { inputMode: "decimal", placeholder: "0,00" })}
          onChange={(e) => set("income", e.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={() => set("income", centsToInput(parseMoneyToCents(form.income)))}
        />
      </FormField>
      {isPerson && (
        <FormField label="Data de nascimento" htmlFor="asaas-birth" error={errors.birthDate} required>
          <Input type="date" {...text("birthDate", { autoComplete: "bday" })} />
        </FormField>
      )}
      {isCompany && (
        <FormField label="Tipo de empresa" htmlFor="asaas-company" error={errors.companyType} required>
          <select
            id="asaas-company"
            name="companyType"
            value={form.companyType}
            disabled={pending}
            onChange={(e) => set("companyType", e.target.value)}
            className="min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-body text-ink"
          >
            <option value="">Selecione</option>
            {Object.entries(COMPANY_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </FormField>
      )}
      <FormField label="CEP" htmlFor="asaas-cep" error={errors.postalCode} required>
        <Input {...text("postalCode", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 9 })} />
      </FormField>
      <FormField label="Rua" htmlFor="asaas-street" error={errors.address} required>
        <Input {...text("address", { autoComplete: "address-line1", maxLength: 200 })} />
      </FormField>
      <FormField label="Número" htmlFor="asaas-number" error={errors.addressNumber} required>
        <Input {...text("addressNumber", { maxLength: 20 })} />
      </FormField>
      <FormField label="Bairro" htmlFor="asaas-province" error={errors.province} required>
        <Input {...text("province", { maxLength: 100 })} />
      </FormField>
      {errors._form && <p role="alert" className="text-caption font-semibold text-danger sm:col-span-2">{errors._form}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending} className="font-extrabold">Criar conta de pagamentos</Button>
      </div>
    </form>
  );
}
