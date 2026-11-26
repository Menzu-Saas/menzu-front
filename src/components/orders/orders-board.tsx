"use client";

import { PREVIEW_ID } from "@/lib/restaurant-preview";

import { Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chip, EmptyState, SegmentedControl, notify } from "@/components/ui";
import { createOrderChime, useRealtimeOrders, type RealtimeState } from "@/hooks/use-realtime-orders";
import { cn } from "@/lib/cn";
import {
  BOARD_FILTERS,
  filterCounts,
  formatDayLong,
  matchesFilter,
  mergeOrderRow,
  sortBoardOrders,
  type BoardAction,
  type BoardFilterId,
  type BoardOrder,
} from "@/lib/order-board";
import { ORDER_STATUS_LABEL, type MemberRole, type OrderStatus } from "@/lib/order-status";
import { getBoardOrderAction, listBoardOrdersAction, updateOrderStatusAction } from "@/server/actions/orders";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { OrderDetailDrawer } from "./order-detail-drawer";
import { OrderRow } from "./order-row";
import { OrdersKanban } from "./orders-kanban";

type View = "kanban" | "list";
const VIEW_KEY = "mz:orders-view";

const STATUS_AT: Partial<Record<OrderStatus, keyof BoardOrder>> = {
  CONFIRMED: "confirmed_at",
  PREPARING: "preparing_at",
  READY: "ready_at",
  OUT_FOR_DELIVERY: "out_for_delivery_at",
  DELIVERED: "delivered_at",
  CANCELLED: "cancelled_at",
};

export interface OrdersBoardProps {
  restaurantId: string;
  role: MemberRole;
  timeZone: string;
  /** Restaurant average prep time (minutes). */
  avgPrepMinutes: number;
  /** "4 de outubro" (restaurant timezone). */
  dayLabel: string;
  initialOrders: BoardOrder[];
  /** Server clock at render (keeps SSR and hydration in sync for elapsed times). */
  serverNow: number;
  /** Show "Simular pagamento (dev)" (never in production or with Mercado Pago configured). */
  devPayments: boolean;
  /** `?pedido=<id>` deep link. */
  initialOrderId: string | null;
}

interface MinimalOrder {
  id: string;
  number: number;
  status: OrderStatus;
  type: BoardOrder["type"];
}

function setPedidoParam(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("pedido", id);
  else url.searchParams.delete("pedido");
  window.history.replaceState(window.history.state, "", url);
}

function LiveIndicator({ state }: { state: RealtimeState }) {
  const live = state === "live";
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-1.5 text-caption font-bold", live ? "text-success" : "text-warning")}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", live ? "bg-success" : "bg-warning motion-safe:animate-pulse")} />
      {live ? "Ao vivo" : state === "connecting" ? "Conectando…" : "Reconectando…"}
    </span>
  );
}

/** /painel/pedidos: reference P2 (header, chips, rows) + Kanban on desktop, realtime and the detail drawer. */
export function OrdersBoard({ restaurantId, role, timeZone, avgPrepMinutes, dayLabel, initialOrders, initialOrderId, serverNow, devPayments }: OrdersBoardProps) {
  const [orders, setOrders] = useState<BoardOrder[]>(() => sortBoardOrders(initialOrders));
  const [filter, setFilter] = useState<BoardFilterId>("all");
  const [view, setView] = useState<View>("kanban");
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(initialOrderId);
  const [detailVersion, setDetailVersion] = useState(0);
  const [cancelling, setCancelling] = useState<MinimalOrder | null>(null);
  const [now, setNow] = useState(serverNow);
  const chime = useRef<ReturnType<typeof createOrderChime> | null>(null);
  const openIdRef = useRef(openId);
  const ordersRef = useRef(orders);
  const busyRef = useRef(busy);
  useEffect(() => {
    openIdRef.current = openId;
    ordersRef.current = orders;
    busyRef.current = busy;
  }, [openId, orders, busy]);

  // Remembered view (desktop only; < lg always shows the list).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a client-only preference
      if (saved === "list" || saved === "kanban") setView(saved);
    } catch {
      // Storage blocked: keep the default.
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Browsers only allow audio after a gesture: unlock on the first interaction.
  useEffect(() => {
    chime.current = createOrderChime();
    const unlock = () => chime.current?.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const openOrder = useCallback((id: string | null) => {
    if (id?.startsWith(PREVIEW_ID)) return;
    setOpenId(id);
    setPedidoParam(id);
  }, []);

  const resync = useCallback(async () => {
    const res = await listBoardOrdersAction(restaurantId);
    if (!res.ok && res.code === "STALE_RESTAURANT") notify.error(res.error, { id: "stale-restaurant" });
    if (res.ok) {
      // Cards with a transition in flight keep their optimistic state; the action settles them.
      const inFlight = busyRef.current;
      setOrders((current) => {
        const kept = current.filter((o) => inFlight.has(o.id) || o.id.startsWith(PREVIEW_ID));
        const fresh = res.data.filter((o) => !inFlight.has(o.id));
        return sortBoardOrders([...kept, ...fresh]);
      });
    }
    setDetailVersion((v) => v + 1);
  }, [restaurantId]);

  // Board left open overnight: when the restaurant's day changes, relabel and reload "today".
  const [day, setDay] = useState(dayLabel);
  useEffect(() => {
    const label = formatDayLong(new Date(now), timeZone);
    if (label === day) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- day rollover detected by the clock tick
    setDay(label);
    void resync();
  }, [now, day, timeZone, resync]);

  const realtime = useRealtimeOrders(restaurantId, {
    onInsert: async (row) => {
      const res = await getBoardOrderAction(restaurantId, row.id);
      if (!res.ok || !res.data) return;
      const card = res.data;
      if (ordersRef.current.some((o) => o.id === card.id)) return;
      setOrders((list) => (list.some((o) => o.id === card.id) ? list : sortBoardOrders([card, ...list])));
      chime.current?.play();
      notify.info(`Novo pedido #${card.number}`, {
        id: `new-order-${card.id}`,
        description: card.customer_name,
        action: { label: "Ver", onClick: () => openOrder(card.id) },
      });
    },
    onUpdate: (row) => {
      setOrders((list) => list.map((o) => (o.id === row.id ? mergeOrderRow(o, row) : o)));
      if (row.id === openIdRef.current) setDetailVersion((v) => v + 1);
    },
    onResync: () => void resync(),
  });

  // The ref is updated synchronously so a resync racing an action already sees the card as busy.
  const markBusy = (id: string, on: boolean) => {
    const next = new Set(busyRef.current);
    if (on) next.add(id);
    else next.delete(id);
    busyRef.current = next;
    setBusy(next);
  };

  /** Optimistic status change with rollback + toast on error. Rejects on failure (dialogs stay open). */
  const transition = useCallback(
    async (order: MinimalOrder, steps: OrderStatus[], reason?: string) => {
      if (order.id.startsWith(PREVIEW_ID)) return;
      const target = steps[steps.length - 1];
      const at = new Date().toISOString();
      const previous = ordersRef.current.find((o) => o.id === order.id);
      setOrders((list) =>
        list.map((o) => {
          if (o.id !== order.id) return o;
          const next: BoardOrder = { ...o, status: target };
          for (const s of steps) {
            const key = STATUS_AT[s];
            if (key) (next as unknown as Record<string, unknown>)[key] = at;
          }
          return next;
        }),
      );
      markBusy(order.id, true);
      const res = await updateOrderStatusAction(restaurantId, order.id, steps, reason);
      markBusy(order.id, false);
      if (!res.ok) {
        if (previous) {
          const prev = previous;
          setOrders((list) => list.map((o) => (o.id === prev.id ? prev : o)));
        }
        // A two-step action may have half-succeeded: reload the card from the server.
        if (steps.length > 1) {
          const fresh = await getBoardOrderAction(restaurantId, order.id);
          if (fresh.ok && fresh.data) {
            const card = fresh.data;
            setOrders((list) => list.map((o) => (o.id === card.id ? card : o)));
          }
        }
        notify.error(res.error);
        setDetailVersion((v) => v + 1);
        throw new Error(res.error);
      }
      notify.success(`Pedido #${order.number} · ${ORDER_STATUS_LABEL[target]}`);
      setDetailVersion((v) => v + 1);
    },
    [restaurantId],
  );

  const runAction = useCallback(
    (order: MinimalOrder, action: BoardAction) => {
      transition(order, action.steps).catch(() => {});
    },
    [transition],
  );

  const handleMove = useCallback(
    (order: BoardOrder, to: OrderStatus) => {
      if (order.id.startsWith(PREVIEW_ID)) return;
      if (to === "CANCELLED") setCancelling(order);
      else transition(order, [to]).catch(() => {});
    },
    [transition],
  );

  const counts = useMemo(() => filterCounts(orders), [orders]);
  const visible = useMemo(() => orders.filter((o) => matchesFilter(o.status, filter)), [orders, filter]);
  // List (P2): open orders first, finished ones (faded) at the bottom; newest first within each group.
  const listed = useMemo(() => {
    const done = (o: BoardOrder) => o.status === "DELIVERED" || o.status === "CANCELLED";
    return [...visible.filter((o) => !done(o)), ...visible.filter(done)];
  }, [visible]);

  const changeView = (v: View) => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // ignore
    }
  };

  const rowHandlers = {
    onOpen: (o: BoardOrder) => openOrder(o.id),
    onAction: runAction,
    onReject: (o: BoardOrder) => setCancelling(o),
    onPrint: (o: BoardOrder) => window.open(`/painel/pedidos/${o.id}/imprimir?autoprint=1`, "_blank", "noopener"),
  };

  const list =
    visible.length === 0 ? (
      <EmptyState
        icon={Inbox}
        title={filter === "all" ? "Nenhum pedido por aqui" : "Nenhum pedido neste filtro"}
        description="Novos pedidos feitos pelo cardápio aparecem aqui, com aviso sonoro."
      />
    ) : (
      <ul className="flex flex-col gap-3" aria-label="Pedidos">
        {listed.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            role={role}
            timeZone={timeZone}
            now={now}
            avgPrepMinutes={avgPrepMinutes}
            busy={busy.has(order.id)}
            {...rowHandlers}
          />
        ))}
      </ul>
    );

  return (
    <div className="flex w-full flex-col gap-5 rounded-6xl border border-frame bg-surface p-4 shadow-card sm:p-6.5">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-title-md text-ink">Pedidos · {day}</h1>
          <LiveIndicator state={realtime} />
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 lg:w-auto">
          <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar pedidos">
            {BOARD_FILTERS.map((f) => (
              <Chip
                key={f.id}
                active={filter === f.id}
                onClick={() => setFilter(f.id)}
                className="px-3.5 py-2.25"
              >
                {/* Label and count in one text node: a flex item would drop the space before "·". */}
                {f.showCount ? `${f.label} · ${counts[f.id]}` : f.label}
              </Chip>
            ))}
          </div>
          <SegmentedControl
            aria-label="Visualização"
            className="hidden lg:inline-flex"
            options={[
              { value: "kanban", label: "Kanban" },
              { value: "list", label: "Lista" },
            ]}
            value={view}
            onChange={changeView}
          />
        </div>
      </div>

      {/* Kanban only on ≥ lg, switched with CSS so desktop never flashes the list before hydration. */}
      {view === "kanban" ? (
        <>
          <div className="hidden min-w-0 flex-col lg:flex">
            <OrdersKanban
              orders={visible}
              role={role}
              timeZone={timeZone}
              now={now}
              avgPrepMinutes={avgPrepMinutes}
              busyIds={busy}
              onOpen={(o) => openOrder(o.id)}
              onAction={runAction}
              onMove={handleMove}
            />
          </div>
          <div className="lg:hidden">{list}</div>
        </>
      ) : (
        list
      )}

      <OrderDetailDrawer
        restaurantId={restaurantId}
        orderId={openId}
        role={role}
        timeZone={timeZone}
        now={now}
        avgPrepMinutes={avgPrepMinutes}
        version={detailVersion}
        devPayments={devPayments}
        busy={openId ? busy.has(openId) : false}
        onClose={() => openOrder(null)}
        onAction={(o, action) => runAction(o, action)}
        onCancel={(o) => setCancelling(o)}
      />

      <CancelOrderDialog
        order={cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        onConfirm={async (reason) => {
          if (!cancelling) return;
          await transition(cancelling, ["CANCELLED"], reason || undefined);
        }}
      />
    </div>
  );
}
