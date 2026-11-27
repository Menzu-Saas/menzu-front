"use client";

import { cn } from "@/lib/cn";
import { useDemoSequence } from "../motion/use-demo-sequence";
import { useInView } from "../motion/use-in-view";
import base from "./demos.module.css";
import styles from "./feature-demos.module.css";

const STATUSES = [
  { label: "Novo", tone: base.pillNew },
  { label: "Confirmado", tone: base.pillCooking },
  { label: "Em preparo", tone: base.pillDone },
];

const OTHERS = [
  { id: "#0139", who: "Mesa 4 · Rafael", status: "Pronto", tone: base.pillDone },
  { id: "#0138", who: "Retirada · Lia", status: "Entregue", tone: "" },
];

/** A new order moves Novo → Confirmado → Em preparo; the bar under it fills step by step. */
export function OrderStatusDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const step = useDemoSequence(STATUSES.length, inView, 1100);

  return (
    <div ref={ref} data-demo="order-status" data-step={step} aria-hidden="true" className={cn(base.stage, styles.list)}>
      <div className={cn(base.orderCard, styles.focusCard)}>
        <header>
          <strong className={base.mono}>#0142</strong>
          <span className={styles.statusStack}>
            {STATUSES.map((status, index) => (
              <span key={status.label} data-current={index === step} className={cn(base.pill, status.tone, styles.status)}>{status.label}</span>
            ))}
          </span>
        </header>
        <p>Entrega · Ana · 1× Lasanha da casa</p>
        <div className={styles.progress}>
          {STATUSES.map((status, index) => <i key={status.label} data-on={index <= step} />)}
        </div>
      </div>
      {OTHERS.map((order) => (
        <div key={order.id} className={cn(base.orderCard, styles.mutedCard)}>
          <header><strong className={base.mono}>{order.id}</strong><span className={cn(base.pill, order.tone || styles.neutral)}>{order.status}</span></header>
          <p>{order.who}</p>
        </div>
      ))}
    </div>
  );
}
