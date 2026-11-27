"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { useDemoSequence } from "../motion/use-demo-sequence";
import { useInView } from "../motion/use-in-view";
import base from "./demos.module.css";
import styles from "./kitchen-board-demo.module.css";

const COLUMNS = [
  { key: "preparar", label: "A preparar" },
  { key: "preparo", label: "Em preparo" },
  { key: "prontos", label: "Prontos" },
] as const;
type Column = (typeof COLUMNS)[number]["key"];

const TICKETS = [
  { id: "#0143", where: "Mesa 2", items: "2× Nhoque ao sugo" },
  { id: "#0144", where: "Entrega", items: "1× Lasanha da casa" },
  { id: "#0145", where: "Retirada", items: "1× Risoto de cogumelos" },
  { id: "#0146", where: "Entrega", items: "1× Tiramisù" },
];

/** [column, row] of each ticket per step. The rush is cleared and the next order arrives (#0146). */
const LAYOUT: [Column, number][][] = [
  [["preparo", 0], ["preparar", 0], ["preparar", 1], ["preparar", 0]],
  [["prontos", 0], ["preparo", 0], ["preparar", 0], ["preparar", 0]],
  [["prontos", 0], ["prontos", 1], ["preparo", 0], ["preparar", 0]],
  [["prontos", 0], ["prontos", 1], ["prontos", 2], ["preparar", 0]],
];
/** The next order only shows up on the last step. */
const visibleAt = (index: number, step: number) => index < 3 || step === LAYOUT.length - 1;
const COLUMN_INDEX: Record<Column, number> = { preparar: 0, preparo: 1, prontos: 2 };
const TIMER: Record<Column, string> = { preparar: "na fila", preparo: "08:40", prontos: "pronto" };

/** Kitchen board: tickets travel between columns (transform only, ease-in-out). */
export function KitchenBoardDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const step = useDemoSequence(LAYOUT.length, inView, 1300);
  const layout = LAYOUT[step]!;
  const count = (column: Column) => layout.filter(([key], index) => key === column && visibleAt(index, step)).length;

  return (
    <div ref={ref} data-demo="kitchen" data-step={step} aria-hidden="true" className={cn(base.stage, styles.board)}>
      <div className={styles.head}>
        {COLUMNS.map((column) => (
          <span key={column.key} className={styles.columnTitle}>
            <i data-column={column.key} />{column.label}<b className={base.mono}>{count(column.key)}</b>
          </span>
        ))}
      </div>
      <div className={styles.lanes}>
        {COLUMNS.map((column) => <span key={column.key} className={styles.lane} />)}
        {TICKETS.map((ticket, index) => {
          const [column, row] = layout[index]!;
          const position = { "--col": COLUMN_INDEX[column], "--row": row } as CSSProperties;
          return (
            <div key={ticket.id} data-ticket={ticket.id} data-column={column} data-visible={visibleAt(index, step)} className={styles.ticket} style={position}>
              <header>
                <strong className={base.mono}>{ticket.id}</strong>
                <span className={cn(styles.timer, base.mono)} data-column={column}>
                  {column === "prontos" && <Check size={12} strokeWidth={3} />}{index === 3 ? "agora" : TIMER[column]}
                </span>
              </header>
              <p>{ticket.where} · {ticket.items}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
