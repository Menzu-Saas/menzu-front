"use client";

import { PREVIEW_ID } from "@/lib/restaurant-preview";

import { ChefHat, CookingPot, Inbox, RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, EmptyState, Icon, notify } from "@/components/ui";
import { createOrderChime } from "@/hooks/use-realtime-orders";
import { kitchenTypeLabel, splitKitchenColumns, type KitchenOrder } from "@/lib/kitchen";
import { formatTime } from "@/lib/order-board";
import { advanceKitchenOrderAction, listKitchenOrdersAction } from "@/server/actions/kitchen";
import { KitchenOrderCard } from "./kitchen-order-card";
import { OpsHeader, type ConnectionState } from "./ops-header";

/** KITCHEN has no realtime access to orders (no RLS rows): the screen polls the RPC instead. */
const POLL_MS = 5_000;

export interface KitchenBoardProps {
  /** Restaurant the page was rendered for (list reads are scoped to it, not to the cookie). */
  restaurantId: string;
  restaurantName: string;
  timeZone: string;
  avgPrepMinutes: number;
  initialOrders: KitchenOrder[];
  /** The SSR `kitchen_orders` call failed: show an error state (never "Ao vivo") until a refresh succeeds. */
  initialLoadFailed?: boolean;
  /** Server clock at render (SSR and hydration agree on timers). */
  serverNow: number;
  showPanelLink: boolean;
}

function Column({
  title,
  icon,
  orders,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  icon: typeof Inbox;
  orders: KitchenOrder[];
  emptyTitle: string;
  emptyDescription: string;
  children: (o: KitchenOrder) => React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3.5">
      <h2 className="flex items-center gap-2 px-1 text-heading text-ink">
        <Icon icon={icon} size={22} className="text-brand" />
        {title}
        <span className="ml-auto inline-flex min-w-8 items-center justify-center rounded-full bg-inverse px-2.5 py-1 text-body-sm font-extrabold text-white">
          {orders.length}
        </span>
      </h2>
      {orders.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-line-strong bg-surface-subtle">
          <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        orders.map((o) => children(o))
      )}
    </section>
  );
}

/** /cozinha: "A preparar" and "Em preparo" columns + "Prontos" strip, polled every 5 s. */
export function KitchenBoard({
  restaurantId,
  restaurantName,
  timeZone,
  avgPrepMinutes,
  initialOrders,
  initialLoadFailed = false,
  serverNow,
  showPanelLink,
}: KitchenBoardProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [connection, setConnection] = useState<ConnectionState>(initialLoadFailed ? "offline" : "live");
  /** False until one load succeeded: an empty board must never pass for "no orders". */
  const [loaded, setLoaded] = useState(!initialLoadFailed);
  const [retrying, setRetrying] = useState(false);
  const [now, setNow] = useState(serverNow);
  const busyRef = useRef(busy);
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const inFlight = useRef(false);
  const again = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const chime = useRef<ReturnType<typeof createOrderChime> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);

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

  const refresh = useCallback(async () => {
    // One request at a time; a refresh asked for meanwhile runs right after (fresh data after actions).
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const res = await listKitchenOrdersAction(restaurantId);
      if (!res.ok) {
        if (res.code === "STALE_RESTAURANT") notify.error(res.error, { id: "stale-restaurant" });
        setConnection("offline");
        return;
      }
      setConnection("live");
      setLoaded(true);
      const fresh = res.data;
      const arrived = fresh.filter((o) => o.status === "CONFIRMED" && !knownIds.current.has(o.id));
      for (const o of fresh) knownIds.current.add(o.id);
      if (arrived.length > 0) {
        chime.current?.play();
        notify.info(arrived.length === 1 ? `Novo pedido #${arrived[0].number}` : `${arrived.length} novos pedidos`, {
          id: `kitchen-new-${arrived[0].id}`,
        });
      }
      // Cards with an action in flight keep their optimistic state until the action settles.
      setOrders((current) => {
        const pending = busyRef.current;
        const kept = current.filter((o) => pending.has(o.id) || o.id.startsWith(PREVIEW_ID));
        return [...kept, ...fresh.filter((o) => !pending.has(o.id))];
      });
    } catch {
      setConnection("offline");
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void refreshRef.current();
      }
    }
  }, [restaurantId]);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // 5 s polling while visible; immediate refresh when the tab/window comes back or the network returns.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const t = setInterval(tick, POLL_MS);
    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOffline = () => setConnection("offline");
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const markBusy = (id: string, on: boolean) => {
    const next = new Set(busyRef.current);
    if (on) next.add(id);
    else next.delete(id);
    busyRef.current = next;
    setBusy(next);
  };

  const advance = useCallback(
    async (order: KitchenOrder) => {
      if (order.id.startsWith(PREVIEW_ID) || busyRef.current.has(order.id)) return;
      const to = order.status === "CONFIRMED" ? "PREPARING" : order.status === "PREPARING" ? "READY" : null;
      if (!to) return;
      markBusy(order.id, true);
      const res = await advanceKitchenOrderAction(restaurantId, order.id, to);
      if (res.ok) {
        const at = new Date().toISOString();
        setOrders((list) =>
          list.map((o) =>
            o.id === order.id ? { ...o, status: to, ...(to === "PREPARING" ? { preparing_at: at } : { ready_at: at }) } : o,
          ),
        );
        if (to === "READY") notify.success(`Pedido #${order.number} pronto`);
      } else {
        notify.error(res.error);
      }
      markBusy(order.id, false);
      void refresh();
    },
    [refresh, restaurantId],
  );

  const retry = async () => {
    setRetrying(true);
    setConnection("connecting");
    await refresh();
    setRetrying(false);
  };

  const columns = useMemo(() => splitKitchenColumns(orders), [orders]);
  const clock = formatTime(new Date(now).toISOString(), timeZone);

  const card = (o: KitchenOrder) => (
    <KitchenOrderCard
      key={o.id}
      order={o}
      now={now}
      avgPrepMinutes={avgPrepMinutes}
      timeZone={timeZone}
      busy={busy.has(o.id)}
      onAdvance={advance}
    />
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <OpsHeader eyebrow="Cozinha" restaurantName={restaurantName} connection={connection} clock={clock} showPanelLink={showPanelLink} />

      <main className="mx-auto flex w-full max-w-container flex-1 flex-col gap-5 px-4 py-5 sm:px-5">
        {!loaded ? (
          <div role="alert" className="rounded-4xl border border-line bg-surface">
            <EmptyState
              icon={WifiOff}
              title="Não foi possível carregar os pedidos"
              description="Verifique a conexão. A tela tenta de novo a cada 5 segundos."
              action={
                <Button variant="outline" size="lg" loading={retrying} onClick={() => void retry()}>
                  {!retrying && <Icon icon={RefreshCw} size={18} />}
                  Tentar novamente
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <section aria-label="Prontos" className="flex items-center gap-3 rounded-3xl border border-success-border bg-success-tint px-4 py-3">
              <span className="eyebrow shrink-0 text-success">Prontos</span>
              {columns.ready.length === 0 ? (
                <span className="text-body-sm text-ink-muted">Nenhum pedido pronto ainda.</span>
              ) : (
                <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
                  {columns.ready.map((o) => (
                    <li
                      key={o.id}
                      className="flex shrink-0 items-center gap-2 rounded-md border border-success-border bg-surface px-3 py-1.5"
                    >
                      <span className="font-mono text-body font-medium text-ink">#{o.number}</span>
                      <span className="text-caption font-bold text-ink-secondary">{kitchenTypeLabel(o)}</span>
                      {o.ready_at && <span className="text-caption text-ink-muted">{formatTime(o.ready_at, timeZone)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="grid flex-1 items-start gap-5 md:grid-cols-2">
              <Column
                title="A preparar"
                icon={Inbox}
                orders={columns.toPrepare}
                emptyTitle="Nada na fila"
                emptyDescription="Pedidos aceitos pelo atendimento aparecem aqui."
              >
                {card}
              </Column>
              <Column
                title="Em preparo"
                icon={CookingPot}
                orders={columns.preparing}
                emptyTitle="Fogão livre"
                emptyDescription="Toque em “Iniciar preparo” para mover um pedido para cá."
              >
                {card}
              </Column>
            </div>
          </>
        )}

        <p className="flex items-center justify-center gap-1.5 text-caption text-ink-faint">
          <Icon icon={ChefHat} size={16} />
          Atualiza automaticamente a cada 5 segundos · tempo médio de preparo {avgPrepMinutes} min
        </p>
      </main>
    </div>
  );
}
