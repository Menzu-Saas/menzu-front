"use client";

import { Badge, Button, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import {
  boardPrimaryAction,
  boardTypeLabel,
  canCancel,
  badgeSuffix,
  formatBoardSchedule,
  itemsSummary,
  PAYMENT_METHOD_SHORT,
  type BoardAction,
  type BoardOrder,
} from "@/lib/order-board";
import type { MemberRole } from "@/lib/order-status";

export interface OrderRowHandlers {
  onOpen: (order: BoardOrder) => void;
  onAction: (order: BoardOrder, action: BoardAction) => void;
  onReject: (order: BoardOrder) => void;
  onPrint: (order: BoardOrder) => void;
}

export interface OrderRowProps extends OrderRowHandlers {
  order: BoardOrder;
  role: MemberRole;
  timeZone: string;
  now: number;
  avgPrepMinutes: number;
  busy?: boolean;
}

/** Scheduled tag shown on rows and cards: "Agendado · 20:30" (with the date when it is not today). */
export function ScheduledTag({ order, timeZone, now }: { order: BoardOrder; timeZone: string; now: number }) {
  if (!order.scheduled_for) return null;
  return (
    <Badge tone="info" size="sm">
      Agendado · {formatBoardSchedule(order.scheduled_for, timeZone, now)}
    </Badge>
  );
}

/**
 * List row, reference P2 ("Pedidos em tempo real"): DM Mono number, customer + items, type · payment
 * + total, status badge, actions. New (PENDING) rows are highlighted brand-tint; finished rows fade.
 */
export function OrderRow({ order, role, timeZone, now, avgPrepMinutes, busy = false, onOpen, onAction, onReject, onPrint }: OrderRowProps) {
  const isNew = order.status === "PENDING";
  const finished = order.status === "DELIVERED" || order.status === "CANCELLED";
  const primary = boardPrimaryAction(order, role, { now, avgPrepMinutes });
  const rejectable = isNew && canCancel(order, role);

  return (
    <li
      className={cn(
        "relative flex flex-wrap items-center gap-4 rounded-3xl px-4.5 py-4 transition-[border-color,opacity] duration-150 ease-out",
        isNew ? "border-selected-tint bg-brand-tint" : "border border-line bg-surface hover:border-line-strong",
        finished && "opacity-72",
      )}
    >
      <span className={cn("w-17.5 font-mono text-body-sm font-semibold", isNew ? "text-brand" : "text-ink-muted")}>
        #{order.number}
      </span>
      <div className="min-w-0 flex-[2_1_200px]">
        {/* The name opens the drawer; the stretched ::after makes the whole row clickable. */}
        <button
          type="button"
          onClick={() => onOpen(order)}
          aria-label={`Abrir pedido #${order.number} de ${order.customer_name}`}
          className="block max-w-full truncate text-left text-body font-bold text-ink after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
        >
          {order.customer_name}
        </button>
        <p className="truncate text-caption text-ink-muted">{itemsSummary(order.items)}</p>
      </div>
      <div className="flex-[1_1_120px]">
        <p className="text-caption text-ink-muted">
          {boardTypeLabel(order)} · {PAYMENT_METHOD_SHORT[order.payment_method]}
        </p>
        <p className="text-body font-extrabold text-ink">{formatMoney(order.total_cents)}</p>
      </div>
      <div className="flex flex-[1_1_110px] flex-wrap items-center gap-1.5">
        <StatusBadge status={order.status} suffix={badgeSuffix(order, now, timeZone)} />
        <ScheduledTag order={order} timeZone={timeZone} now={now} />
      </div>
      <div className="relative z-10 ml-auto flex gap-2">
        {rejectable ? (
          <Button variant="outline" size="sm" className="text-ink-muted" disabled={busy} onClick={() => onReject(order)}>
            Recusar
          </Button>
        ) : finished || !primary ? (
          <Button variant="outline" size="sm" className="text-ink-muted" onClick={() => onOpen(order)}>
            Detalhes
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="text-ink-muted" onClick={() => onPrint(order)}>
            Imprimir
          </Button>
        )}
        {primary && (
          <Button
            variant={primary.variant}
            size="sm"
            className="px-4 font-extrabold"
            loading={busy}
            onClick={() => onAction(order, primary)}
          >
            {primary.label}
          </Button>
        )}
      </div>
    </li>
  );
}
