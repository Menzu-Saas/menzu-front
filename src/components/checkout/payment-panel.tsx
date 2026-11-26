"use client";

import styles from "./checkout-layout.module.css";

import { Banknote, CreditCard, FlaskConical, QrCode, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button, FormField, Icon, Input, OptionCard, OptionGroup, ResponsiveSheet, SegmentedControl } from "@/components/ui";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import type { OrderType } from "@/lib/order-status";
import type { PaymentMethod } from "@/lib/types";
import type { CardType } from "@/lib/schemas/order";

export const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  PIX: QrCode, CARD_ONLINE: CreditCard, CARD_ON_DELIVERY: CreditCard, CASH: Banknote,
};

export function paymentLabel(method: PaymentMethod, type: OrderType, provider: string, cardType: CardType = "CREDIT"): { title: string; hint?: string } {
  const where = type === "DELIVERY" ? "na entrega" : type === "PICKUP" ? "na retirada" : "na mesa";
  switch (method) {
    case "PIX": return { title: "Pix", hint: "O QR Code aparece após confirmar o pedido." };
    case "CARD_ONLINE": return provider === "asaas"
      // Asaas' own page: the buyer types the card there, never in Menzu.
      ? { title: "Cartão de crédito online", hint: "Após confirmar, você paga em uma página segura do Asaas." }
      : {
        title: cardType === "DEBIT" ? "Cartão de débito online" : "Cartão de crédito online",
        hint: provider === "mercadopago" ? "Você paga em uma página segura do Mercado Pago." : "Pagamento online com cartão.",
      };
    case "CASH": return { title: `Dinheiro ${where}` };
    case "CARD_ON_DELIVERY": return { title: `Cartão ${where}` };
  }
}

export interface PaymentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: PaymentMethod[];
  value: PaymentMethod | null;
  changeFor: string;
  type: OrderType;
  provider: string;
  onConfirm: (method: PaymentMethod, changeFor: string, cardType?: CardType) => void;
  cardType?: CardType;
  onlineAvailable?: boolean;
  error?: string;
  totalCents?: number | null;
}

export function PaymentPanel({ open, onOpenChange, methods, value, changeFor, type, provider, onConfirm, error, totalCents, cardType = "CREDIT", onlineAvailable = true }: PaymentPanelProps) {
  const [wasOpen, setWasOpen] = useState(open);
  const [method, setMethod] = useState(value);
  const initialTiming = value === "CASH" || (!value && !onlineAvailable) ? "later" : "online";
  const [timing, setTiming] = useState(initialTiming);
  const [change, setChange] = useState(changeFor);
  const [kind, setKind] = useState<CardType>(cardType);
  const [changeError, setChangeError] = useState<string>();
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setMethod(value);
      setTiming(initialTiming);
      setChange(changeFor);
      setKind(cardType);
      setChangeError(undefined);
    }
  }

  const allowed = methods.filter((item) => item !== "CARD_ON_DELIVERY");
  const later = type === "DELIVERY" ? "Pagar na entrega" : type === "PICKUP" ? "Pagar na retirada" : "Pagar na mesa";
  // Asaas' page decides how the card is paid, so there is a single card option there.
  const splitCard = provider !== "asaas";
  const choices = allowed.flatMap<{ value: string; method: PaymentMethod; cardType?: CardType }>((item) => item === "CARD_ONLINE" && splitCard ? ([{ value: "CARD_CREDIT", method: item, cardType: "CREDIT" as const }, { value: "CARD_DEBIT", method: item, cardType: "DEBIT" as const }]) : [{ value: item, method: item, cardType: item === "CARD_ONLINE" ? "CREDIT" as const : undefined }]);
  const groups = [
    { value: "online", label: "Pagar na compra", methods: choices.filter((item) => item.method !== "CASH") },
    { value: "later", label: later, methods: choices.filter((item) => item.method === "CASH") },
  ].filter((group) => group.methods.length);
  const visibleGroup = groups.find((group) => group.value === timing) ?? groups[0];
  const selected = visibleGroup?.methods.some((item) => item.method === method) && (method === "CASH" || onlineAvailable) ? method : null;
  const selectedValue = selected === "CARD_ONLINE" && splitCard ? `CARD_${kind}` : selected;

  function confirm() {
    if (!selected) return;
    const amount = change.trim();
    if (selected === "CASH" && amount) {
      const cents = parseMoneyToCents(amount);
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$|^\d+\.\d{1,2}$/.test(amount) || !Number.isSafeInteger(cents)) {
        setChangeError("Informe um valor de troco válido.");
        return;
      }
      if (totalCents != null && cents < totalCents) {
        setChangeError(`O valor para troco deve ser pelo menos ${formatMoney(totalCents)}.`);
        return;
      }
    }
    if (selected === "CARD_ONLINE") onConfirm(selected, change, kind);
    else onConfirm(selected, change);
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Forma de pagamento" description="Escolha como deseja pagar o pedido." className={styles.checkoutDialog + " max-md:h-dvh max-md:max-h-dvh max-md:rounded-none"} footer={<>
      <Button type="button" size="lg" block disabled={!selected} onClick={confirm}>Usar esta forma de pagamento</Button>
      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
    </>}>
      <div className="flex flex-col gap-4">
        {groups.length > 1 && <SegmentedControl aria-label="Quando pagar" className={styles.paymentTabs} block options={groups} value={visibleGroup.value}
          onChange={(next) => { setTiming(next === "later" ? "later" : "online"); setChangeError(undefined); }} />}
        <OptionGroup value={selectedValue} onValueChange={(next) => { const choice = choices.find((item) => item.value === next); if (!choice || (choice.method !== "CASH" && !onlineAvailable)) return; setMethod(choice.method); if (choice.cardType) setKind(choice.cardType); setChangeError(undefined); }} aria-label="Forma de pagamento" className="gap-4">
          {visibleGroup && [visibleGroup].map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-2.5">
              <h3 className="text-micro font-extrabold tracking-wide text-ink-faint uppercase">{group.label}</h3>
              {group.methods.map((item) => {
                const label = paymentLabel(item.method, type, provider, item.cardType);
                const disabled = item.method !== "CASH" && !onlineAvailable;
                return <OptionCard key={item.value} value={item.value} disabled={disabled} className={styles.paymentRow}>
                  <span className="flex items-center gap-2.5 font-semibold"><span className={styles.paymentIcon}><Icon icon={METHOD_ICON[item.method]} size={18} /></span>{label.title}</span>
                  {label.hint && <span className="block text-caption font-normal text-ink-muted">{label.hint}</span>}
                  {disabled && <span className="block text-caption font-semibold text-ink-muted">Indisponível no momento</span>}
                </OptionCard>;
              })}
            </div>
          ))}
        </OptionGroup>
        {!allowed.length && <p className="text-body-sm text-ink-muted">Nenhuma forma de pagamento disponível no momento.</p>}
        {error && <p role="alert" className="text-caption font-semibold text-danger">{error}</p>}
        {(selected === "PIX" || selected === "CARD_ONLINE") && provider === "development" && <div role="note" className="flex items-start gap-2.5 rounded-xl border border-dashed border-brand-dashed bg-brand-tint px-3.5 py-3 text-body-sm text-ink-secondary">
          <Icon icon={FlaskConical} size={18} className="mt-px text-brand" /><span>Pagamento em modo de desenvolvimento — nenhuma cobrança real.</span>
        </div>}
        {selected === "CASH" && <FormField label="Troco para" htmlFor="payment-change" error={changeError} hint="Opcional. Deixe em branco se não precisar de troco.">
          <Input size="lg" inputMode="decimal" value={change} onChange={(event) => { setChange(event.target.value); setChangeError(undefined); }} placeholder="R$ 100,00" />
        </FormField>}
      </div>
    </ResponsiveSheet>
  );
}
