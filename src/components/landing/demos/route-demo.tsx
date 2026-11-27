"use client";

import { Bike, Home, Store } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useDemoSequence } from "../motion/use-demo-sequence";
import { useInView } from "../motion/use-in-view";
import base from "./demos.module.css";
import styles from "./feature-demos.module.css";

/** One path for the drawn line and for the courier's motion (everything lives in the SVG, so it scales). */
const ROUTE = "M 44 150 C 100 150 96 70 156 70 S 214 122 262 112 S 318 44 356 44";
const STATUS = ["Pronto para sair", "Saiu para entrega", "Chegando", "Entregue"];

function Pin({ x, y, done, children }: { x: number; y: number; done?: boolean; children: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`} className={styles.pin} data-done={done}>
      <circle r="15" />
      <svg x="-8" y="-8" width="16" height="16" overflow="visible">{children}</svg>
    </g>
  );
}

/** Delivery: the route draws itself, the courier rides it, the status follows. */
export function RouteDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const step = useDemoSequence(4, inView, 1300);
  const motion = useRef<SVGAnimateMotionElement>(null);

  useEffect(() => {
    if (step === 2) motion.current?.beginElement?.();
  }, [step]);

  return (
    <div ref={ref} data-demo="route" data-step={step} aria-hidden="true" className={cn(base.stage, styles.route)}>
      <svg viewBox="0 0 400 190" className={styles.map}>
        <path className={styles.streets} d="M0 44 H400 M0 112 H400 M0 162 H400 M70 0 V190 M190 0 V190 M300 0 V190" />
        <path d={ROUTE} className={styles.routeBase} />
        <path d={ROUTE} pathLength={1} className={styles.routeLine} data-drawn={step >= 1} />
        <Pin x={44} y={150}><Store width={16} height={16} /></Pin>
        <Pin x={356} y={44} done={step >= 3}><Home width={16} height={16} /></Pin>
        <g className={styles.courier} data-riding={step === 2}>
          <circle r="13" />
          <svg x="-7" y="-7" width="14" height="14" overflow="visible"><Bike width={14} height={14} /></svg>
          <animateMotion ref={motion} begin="indefinite" dur="1.2s" fill="freeze" path={ROUTE} calcMode="spline" keyTimes="0;1" keySplines="0.77 0 0.175 1" />
        </g>
      </svg>
      <div className={styles.routeStatus}>
        <span className={cn(base.pill, step >= 3 ? base.pillDone : base.pillNew)}>{STATUS[step]}</span>
        <span className={base.mono}>{step >= 3 ? "agora" : `${12 - step * 4} min`}</span>
      </div>
    </div>
  );
}
