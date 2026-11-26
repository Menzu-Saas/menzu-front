"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState, type KeyboardEventHandler, type PointerEventHandler } from "react";
import { Button, Icon, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import {
  BOARD_COLUMNS,
  badgeSuffix,
  boardPrimaryAction,
  boardTypeLabel,
  dropTargets,
  itemsSummary,
  PAYMENT_METHOD_SHORT,
  type BoardAction,
  type BoardColumn,
  type BoardOrder,
} from "@/lib/order-board";
import type { MemberRole, OrderStatus } from "@/lib/order-status";
import { ScheduledTag } from "./order-row";

export interface OrdersKanbanProps {
  orders: BoardOrder[];
  role: MemberRole;
  timeZone: string;
  now: number;
  avgPrepMinutes: number;
  busyIds: ReadonlySet<string>;
  onOpen: (order: BoardOrder) => void;
  onAction: (order: BoardOrder, action: BoardAction) => void;
  /** A card was dropped on an allowed column (CANCELLED included: the caller asks for a reason). */
  onMove: (order: BoardOrder, to: OrderStatus) => void;
}

/** The column under the pointer wins; keyboard drags (no pointer) fall back to rectangle overlap. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

interface CardBodyProps {
  order: BoardOrder;
  timeZone: string;
  now: number;
}

function CardBody({ order, timeZone, now }: CardBodyProps) {
  const isNew = order.status === "PENDING";
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("font-mono text-body-sm font-semibold", isNew ? "text-brand" : "text-ink-muted")}>
          #{order.number}
        </span>
        <StatusBadge status={order.status} size="sm" suffix={badgeSuffix(order, now, timeZone)} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-body font-bold text-ink">{order.customer_name}</p>
        <p className="line-clamp-2 text-caption text-ink-muted">{itemsSummary(order.items)}</p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="min-w-0 truncate text-caption text-ink-muted">
          {boardTypeLabel(order)} · {PAYMENT_METHOD_SHORT[order.payment_method]}
        </p>
        <p className="shrink-0 whitespace-nowrap text-body font-extrabold text-ink">{formatMoney(order.total_cents)}</p>
      </div>
      <ScheduledTag order={order} timeZone={timeZone} now={now} />
    </>
  );
}

function cardClass(order: BoardOrder) {
  const isNew = order.status === "PENDING";
  const finished = order.status === "DELIVERED" || order.status === "CANCELLED";
  return cn(
    "flex flex-col gap-2.5 rounded-3xl p-3.5 text-left",
    isNew ? "border-selected-tint bg-brand-tint" : "border border-line bg-surface",
    finished && "opacity-72",
  );
}

function DraggableCard({
  order,
  role,
  timeZone,
  now,
  avgPrepMinutes,
  busy,
  onOpen,
  onAction,
}: CardBodyProps & {
  role: MemberRole;
  avgPrepMinutes: number;
  busy: boolean;
  onOpen: (order: BoardOrder) => void;
  onAction: (order: BoardOrder, action: BoardAction) => void;
}) {
  const draggable = dropTargets(order, role).length > 0 && !busy;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { order },
    disabled: !draggable,
  });
  const primary = boardPrimaryAction(order, role, { now, avgPrepMinutes });

  return (
    <li
      ref={setNodeRef}
      className={cn(
        cardClass(order),
        "relative transition-[border-color,opacity] duration-150 ease-out hover:border-line-strong",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      // Mouse/touch drag starts anywhere on the card; keyboard drag lives on the handle below.
      onPointerDown={listeners?.onPointerDown as PointerEventHandler | undefined}
    >
      {/* The whole card opens the order: a real button under the (non-interactive) content. */}
      <button
        type="button"
        aria-label={`Abrir pedido #${order.number} de ${order.customer_name}`}
        className="absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => onOpen(order)}
      />
      {draggable && (
        <button
          type="button"
          {...attributes}
          ref={setActivatorNodeRef}
          onKeyDown={listeners?.onKeyDown as KeyboardEventHandler | undefined}
          aria-roledescription="pedido arrastável"
          aria-label={`Mover pedido #${order.number} para outra coluna`}
          className="sr-only z-10 rounded-lg bg-surface px-2 py-1 text-caption font-bold text-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          Mover
        </button>
      )}
      <div className="pointer-events-none relative flex flex-col gap-2.5">
        <CardBody order={order} timeZone={timeZone} now={now} />
      </div>
      {primary && (
        <Button
          variant={primary.variant}
          size="sm"
          block
          className="relative font-extrabold"
          loading={busy}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onAction(order, primary)}
        >
          {primary.label}
        </Button>
      )}
    </li>
  );
}

function Column({
  column,
  orders,
  collapsed,
  onToggle,
  dragTargets,
  dragging,
  children,
}: {
  column: BoardColumn;
  orders: BoardOrder[];
  collapsed: boolean;
  onToggle: () => void;
  dragTargets: OrderStatus[] | null;
  dragging: boolean;
  children: React.ReactNode;
}) {
  const allowed = dragTargets?.includes(column.status) ?? false;
  const { setNodeRef, isOver } = useDroppable({ id: column.status, disabled: !allowed });
  const dimmed = dragging && !allowed;

  const frame = cn(
    "flex min-h-0 flex-col rounded-4xl border transition-[border-color,background-color,opacity] duration-150 ease-out",
    allowed && isOver
      ? "border-selected-accent bg-brand-tint"
      : allowed
        ? "border-dashed border-brand-tint-border bg-brand-tint"
        : "border-line bg-surface-subtle",
    dimmed && "opacity-50",
  );

  if (collapsed) {
    return (
      <section ref={setNodeRef} aria-label={`${column.title} (${orders.length})`} className={cn(frame, "w-14 shrink-0 items-center")}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-label={`Mostrar ${column.title.toLowerCase()} (${orders.length})`}
          className="flex h-full w-full flex-col items-center gap-3 rounded-4xl px-2 py-4 text-ink-subtle hover:text-ink"
        >
          <Icon icon={ChevronLeft} size={16} />
          <span className="rounded-full bg-neutral-badge px-2 py-0.5 text-micro text-ink-secondary">{orders.length}</span>
          <span className="eyebrow [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">{column.title}</span>
        </button>
      </section>
    );
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.title} (${orders.length})`}
      className={cn(frame, "w-64 min-w-56 flex-1 shrink-0")}
    >
      <header className="flex items-center gap-2 px-3.5 pt-3.5 pb-2.5">
        <h2 className="eyebrow flex-1 truncate text-ink-subtle">{column.title}</h2>
        <span className="rounded-full bg-neutral-badge px-2 py-0.5 text-micro text-ink-secondary">{orders.length}</span>
        {column.collapsible && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded
            aria-label={`Recolher ${column.title.toLowerCase()}`}
            className="rounded-md p-1 text-ink-subtle hover:bg-surface-muted hover:text-ink"
          >
            <Icon icon={ChevronRight} size={16} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

/** Kanban (≥ lg): one column per status; drag a card onto the columns its role may move it to. */
export function OrdersKanban({ orders, role, timeZone, now, avgPrepMinutes, busyIds, onOpen, onAction, onMove }: OrdersKanbanProps) {
  // Stable id so the SSR and client a11y ids (DndDescribedBy-*) match.
  const dndId = useId();
  const [active, setActive] = useState<BoardOrder | null>(null);
  const [expanded, setExpanded] = useState<Partial<Record<OrderStatus, boolean>>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const targets = active ? dropTargets(active, role) : null;

  function handleStart(e: DragStartEvent) {
    setActive((e.active.data.current as { order: BoardOrder } | undefined)?.order ?? null);
  }

  function handleEnd(e: DragEndEvent) {
    const order = (e.active.data.current as { order: BoardOrder } | undefined)?.order;
    setActive(null);
    const to = e.over?.id as OrderStatus | undefined;
    if (!order || !to || to === order.status) return;
    if (!dropTargets(order, role).includes(to)) return;
    onMove(order, to);
  }

  return (
    <DndContext
      id={dndId}
      collisionDetection={collision}
      sensors={sensors}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Pressione espaço para pegar o pedido, use as setas para escolher a coluna e espaço para soltar.",
        },
      }}
    >
      <div className="flex min-h-120 gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((column) => {
          const list = orders.filter((o) => o.status === column.status);
          const collapsed = column.collapsible && !expanded[column.status];
          return (
            <Column
              key={column.status}
              column={column}
              orders={list}
              collapsed={collapsed}
              onToggle={() => setExpanded((x) => ({ ...x, [column.status]: !x[column.status] }))}
              dragTargets={targets}
              dragging={active != null}
            >
              <ul className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-2.5">
                {list.map((order) => (
                  <DraggableCard
                    key={order.id}
                    order={order}
                    role={role}
                    timeZone={timeZone}
                    now={now}
                    avgPrepMinutes={avgPrepMinutes}
                    busy={busyIds.has(order.id)}
                    onOpen={onOpen}
                    onAction={onAction}
                  />
                ))}
                {list.length === 0 && (
                  <li className="rounded-3xl border border-dashed border-line-strong px-3 py-6 text-center text-caption text-ink-faint">
                    Nenhum pedido
                  </li>
                )}
              </ul>
            </Column>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className={cn(cardClass(active), "w-64 cursor-grabbing bg-surface shadow-raised-lg")}>
            <CardBody order={active} timeZone={timeZone} now={now} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
