"use client";

import styles from "./checkout-layout.module.css";

import { useEffect, useState } from "react";
import { Button, FormField, Input, ResponsiveSheet } from "@/components/ui";
import { cpfDigits, formatCpf, isValidCpf, maskedCpf } from "@/lib/cpf";
import { isValidBrPhone, maskPhone, onlyDigits } from "@/lib/phone";

export type CustomerDetails = { name: string; phone: string; email: string; cpf: string };

export type CpfState = {
  /** CPF já guardado neste aparelho (só dígitos), para quem não tem conta. */
  deviceValue: string;
  /** 3 últimos dígitos do CPF guardado na conta; o número completo nunca chega ao navegador. */
  savedLast3: string | null;
  signedIn: boolean;
};

export function CustomerPanel({ open, onOpenChange, value, emailRequired, cpfRequired = false, cpf, onConfirm, serverError, initialErrors }: {
  open: boolean; onOpenChange: (open: boolean) => void; value: CustomerDetails; emailRequired: boolean;
  /** Only Pix and card need the CPF; cash orders never ask for it. */
  cpfRequired?: boolean;
  cpf: CpfState; onConfirm: (value: CustomerDetails) => void; serverError?: string; initialErrors?: Partial<CustomerDetails>;
}) {
  const [draft, setDraft] = useState(value);
  const [changingCpf, setChangingCpf] = useState(false);
  const [errors, setErrors] = useState<Partial<CustomerDetails>>(initialErrors ?? {});
  const [initialFocus] = useState(() => Object.entries(initialErrors ?? {}).find(([, message]) => message)?.[0]);
  useEffect(() => { if (initialFocus) document.getElementById(initialFocus)?.focus(); }, [initialFocus]);
  const accountCpf = cpf.signedIn && cpf.savedLast3 && !changingCpf ? cpf.savedLast3 : null;
  function update(key: keyof CustomerDetails, value: string) { setDraft((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); }
  function validate() {
    const next: Partial<CustomerDetails> = {};
    if (draft.name.trim().length < 2) next.name = "Informe seu nome.";
    if (!isValidBrPhone(onlyDigits(draft.phone))) next.phone = "Informe um celular válido com DDD.";
    if ((emailRequired || draft.email.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = "Informe um e-mail válido.";
    if (!accountCpf) {
      if (!draft.cpf.trim()) { if (cpfRequired) next.cpf = "Informe seu CPF para pagar online."; }
      else if (!isValidCpf(draft.cpf)) next.cpf = "Informe um CPF válido.";
    }
    return next;
  }
  const invalid = Object.keys(validate()).length > 0;
  function confirm() {
    if (invalid) return;
    onConfirm({ name: draft.name.trim(), phone: onlyDigits(draft.phone), email: draft.email.trim(), cpf: accountCpf ? "" : cpfDigits(draft.cpf) });
  }
  const where = cpf.signedIn ? "Fica guardado de forma protegida na sua conta." : "Fica guardado só neste aparelho.";
  return <ResponsiveSheet open={open} onOpenChange={onOpenChange} className={styles.checkoutDialog} title="Seus dados" description="Como o restaurante pode falar com você sobre este pedido." footer={<div className="grid w-full gap-2"><Button size="lg" disabled={invalid} onClick={confirm}>Salvar dados</Button><Button size="lg" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button></div>}>
    <div className="space-y-4">
      {serverError && <p role="alert" className="text-body-sm text-danger">{serverError}</p>}
      <FormField label="Nome" htmlFor="name" required error={errors.name}><Input size="lg" value={draft.name} maxLength={80} autoComplete="name" onBlur={() => setErrors((current) => ({ ...current, name: validate().name }))} onChange={(e) => update("name", e.target.value)} /></FormField>
      <FormField label="Celular (WhatsApp)" htmlFor="phone" required error={errors.phone}><Input size="lg" type="tel" inputMode="tel" value={draft.phone} maxLength={30} autoComplete="tel-national" onBlur={() => setErrors((current) => ({ ...current, phone: validate().phone }))} onChange={(e) => update("phone", maskPhone(e.target.value))} /></FormField>
      <FormField label={emailRequired ? "E-mail" : "E-mail (opcional)"} htmlFor="email" required={emailRequired} error={errors.email} hint={emailRequired ? "Necessário para a forma de pagamento escolhida." : undefined}><Input size="lg" type="email" value={draft.email} maxLength={120} autoComplete="email" onBlur={() => setErrors((current) => ({ ...current, email: validate().email }))} onChange={(e) => update("email", e.target.value)} /></FormField>
      {accountCpf ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3 text-body-sm">
          <span className="text-ink">CPF {maskedCpf(accountCpf)} cadastrado</span>
          <button type="button" className="font-bold text-brand" onClick={() => setChangingCpf(true)}>Trocar</button>
        </div>
      ) : (
        <FormField label={cpfRequired ? "CPF" : "CPF (opcional)"} htmlFor="cpf" required={cpfRequired} error={errors.cpf} hint={cpfRequired ? `Necessário para pagar online (Pix e cartão). ${where}` : `Só é pedido para pagar online (Pix e cartão). ${where}`}>
          <Input size="lg" inputMode="numeric" placeholder="000.000.000-00" value={draft.cpf} maxLength={14} autoComplete="off" onBlur={() => setErrors((current) => ({ ...current, cpf: validate().cpf }))} onChange={(e) => update("cpf", formatCpf(e.target.value))} />
        </FormField>
      )}
    </div>
  </ResponsiveSheet>;
}
