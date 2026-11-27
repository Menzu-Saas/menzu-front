"use client";

import { Plus, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { DEMO_DISHES, DEMO_RESTAURANT, formatPrice } from "../copy";
import { useDemoSequence } from "../motion/use-demo-sequence";
import { useInView } from "../motion/use-in-view";
import base from "./demos.module.css";
import styles from "./order-flow-demo.module.css";

const PICKED = DEMO_DISHES[0]!;
const COOKING = [
  { id: "#0140", name: "Bruno", items: "2× Nhoque ao sugo", time: "12 min" },
  { id: "#0141", name: "Carla", items: "1× Risoto de cogumelos", time: "6 min" },
];

/**
 * Hero demo, "do pedido à cozinha": (1) a dish is added, (2) the bag shows it, (3) the order lands
 * in the kitchen panel's "Novos" column. Ends on the final step.
 */
export function OrderFlowDemo() {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "0px" });
  const step = useDemoSequence(4, inView, 950);

  return (
    <div ref={ref} data-demo="order-flow" data-step={step} aria-hidden="true" className={cn(base.stage, styles.stage)}>
      <div className={cn(base.window, styles.window)}>
        <div className={base.windowBar}>
          <span className={base.windowDots}><i /><i /><i /></span>
          <span>painel / pedidos</span>
          <span className={styles.live}><i />ao vivo</span>
        </div>
        <div className={styles.board}>
          <section>
            <h4>Novos <span className={base.mono}>{step >= 3 ? 1 : 0}</span></h4>
            <div className={styles.slot}>
              <div className={cn(base.orderCard, styles.arriving)} data-arrived={step >= 3}>
              <header><strong className={base.mono}>#0142</strong><span className={cn(base.pill, base.pillNew)}>agora</span></header>
              <p>Ana · 1× {PICKED.name}</p>
              <p className={base.mono}>{formatPrice(PICKED.priceCents)}</p>
            </div>
              <div className={styles.emptySlot} data-hidden={step >= 3}>Aguardando pedidos</div>
            </div>
          </section>
          <section>
            <h4>Em preparo <span className={base.mono}>{COOKING.length}</span></h4>
            {COOKING.map((order) => (
              <div key={order.id} className={base.orderCard}>
                <header><strong className={base.mono}>{order.id}</strong><span className={cn(base.pill, base.pillCooking)}>{order.time}</span></header>
                <p>{order.name} · {order.items}</p>
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className={cn(base.phone, styles.phone)}>
        <div className={base.screen}>
          <span className={base.notch} />
          <div className={styles.menuHeader}>
            <span className={styles.logo}>{DEMO_RESTAURANT.slice(0, 1)}</span>
            <div>
              <strong>{DEMO_RESTAURANT}</strong>
              <span className={base.mono}>aberto · 30–40 min</span>
            </div>
          </div>
          <ul className={styles.menu}>
            {DEMO_DISHES.slice(0, 3).map((dish, index) => (
              <li key={dish.name} data-picked={index === 0 && step >= 1}>
                <span className={cn(base.dish, styles.thumb)} data-tone={dish.tone} />
                <span className={styles.dishText}>
                  <strong>{dish.name}</strong>
                  <span className={base.mono}>{formatPrice(dish.priceCents)}</span>
                </span>
                <span className={styles.add} data-pressed={index === 0 && step === 1} data-added={index === 0 && step >= 2}><Plus size={14} strokeWidth={2.6} /></span>
              </li>
            ))}
          </ul>
          <div className={styles.bag} data-shown={step >= 2}>
            <ShoppingBag size={15} />
            <span>Sacola</span>
            <span className={base.mono}>{formatPrice(PICKED.priceCents)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
