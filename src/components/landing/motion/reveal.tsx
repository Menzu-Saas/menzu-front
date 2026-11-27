"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useInView } from "./use-in-view";
import styles from "./motion.module.css";

/** Stagger between siblings, in ms (spec: 40–60 ms). */
const STAGGER_MS = 50;

export interface RevealProps {
  as?: "div" | "section" | "li";
  /** Position in a staggered group (0, 1, 2…). */
  delay?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Fades and lifts its content once when it scrolls into view. The content is rendered visible;
 * it is only hidden while `html[data-motion="ok"]` (set by MotionScript before paint).
 */
export function Reveal({ as: Tag = "div", delay = 0, className, children }: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref as never}
      data-shown={inView}
      className={cn(styles.reveal, className)}
      style={{ "--reveal-delay": `${delay * STAGGER_MS}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
