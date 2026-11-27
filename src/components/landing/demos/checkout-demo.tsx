"use client";

import { Check, CreditCard, QrCode, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { DEMO_DISHES, formatPrice } from "../copy";
import { useDemoSequence } from "../motion/use-demo-sequence";
import { useInView } from "../motion/use-in-view";
import base from "./demos.module.css";
import styles from "./feature-demos.module.css";

const TOTAL = DEMO_DISHES[0]!.priceCents + 800;
const METHODS = [
  { key: "pix", label: "Pix", icon: QrCode },
  { key: "card", label: "Cartão", icon: CreditCard },
  { key: "cash", label: "Dinheiro", icon: Wallet },
];

/** Checkout in the browser: Pix is chosen, the button is pressed, the order is sent. */
export function CheckoutDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const step = useDemoSequence(4, inView, 900);

  return (
    <div ref={ref} data-demo="checkout" data-step={step} aria-hidden="true" className={cn(base.stage, styles.checkout)}>
      <strong className={styles.checkoutTitle}>Finalizar pedido</strong>
      <div className={styles.methods}>
        {METHODS.map(({ key, label, icon: Icon }) => (
          <span key={key} className={styles.method} data-selected={key === "pix" && step >= 1}>
            <Icon size={16} />{label}
          </span>
        ))}
      </div>
      <div className={styles.totalRow}><span>Total</span><strong className={base.mono}>{formatPrice(TOTAL)}</strong></div>
      <div className={styles.confirm} data-pressed={step === 2} data-done={step >= 3}>
        <span className={styles.confirmIdle}>Confirmar pedido</span>
        <span className={styles.confirmDone}><Check size={16} strokeWidth={3} />Pedido enviado</span>
      </div>
    </div>
  );
}
