"use client";

import { Bike, PackageCheck, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, ConfirmationDialog, DataTable, EmptyState, Icon, SegmentedControl, ResponsiveSheet, notify } from "@/components/ui";
import { Pagination } from "@/components/ui/pagination";
import { OpsHeader, type ConnectionState } from "@/components/kitchen/ops-header";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { collectionFor, splitDeliverySections, type DeliveryOrder } from "@/lib/delivery";
import { formatTime } from "@/lib/order-board";
import { formatMoney } from "@/lib/money";
import { advanceDeliveryOrderAction, listDeliveryOrdersAction, receiveDeliveryPaymentAction } from "@/server/actions/delivery";
import { OrderTrackingPanel } from "./order-tracking-panel";
import { DeliveryOrderCard } from "./delivery-order-card";

/** Realtime is the primary channel; this is the safety net. */
const FALLBACK_POLL_MS = 30_000;

export interface DeliveryBoardProps {
  restaurantId: string;
  restaurantName: string;
  timeZone: string;
  initialOrders: DeliveryOrder[];
  serverNow: number;
  showPanelLink: boolean;
  settings?: ReactNode;
}

type Busy = Record<string, "status" | "payment">;

function Section({ title, icon, count, children }: { title: string; icon: typeof Bike; count: number; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3">
      <h2 className="flex items-center gap-2 px-1 text-subheading text-ink md:text-heading">
        <Icon icon={icon} size={20} className="text-brand" />
        {title}
        <span className="ml-auto inline-flex min-w-7 items-center justify-center rounded-full bg-inverse px-2 py-0.5 text-caption font-extrabold text-white">
          {count}
        </span>
      </h2>
      {children}
    </section>
  );
}

/** /entregas: "Prontos para sair" → "Em rota" → "Entregues hoje", live through Supabase realtime (RLS). */
export function DeliveryBoard({ restaurantId, restaurantName, timeZone, initialOrders, serverNow, showPanelLink, settings }: DeliveryBoardProps) {
  const [trackingOrder,setTrackingOrder]=useState<DeliveryOrder|null>(null);
  const [historyView, setHistoryView] = useState<"cards" | "list">("cards");
  const [historyPage, setHistoryPage] = useState(1);
  const [orders, setOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [busy, setBusy] = useState<Busy>({});
  const [now, setNow] = useState(serverNow);
  const [pollFailed, setPollFailed] = useState(false);
  const [confirming, setConfirming] = useState<DeliveryOrder | null>(null);
  const busyRef = useRef<Busy>({});
  const inFlight = useRef(false);
  const again = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const res = await listDeliveryOrdersAction(restaurantId);
      if (!res.ok) {
        if (res.code === "STALE_RESTAURANT") notify.error(res.error, { id: "stale-restaurant" });
        setPollFailed(true);
        return;
      }
      setPollFailed(false);
      setOrders((current) => {
        const pending = busyRef.current;
        const kept = current.filter((o) => pending[o.id]);
        return [...kept, ...res.data.filter((o) => !pending[o.id])];
      });
    } catch {
      setPollFailed(true);
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

  // Realtime rows lack the payment/addresses join: any change triggers a (debounced) refetch.
  const scheduleRefresh = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void refreshRef.current(), 300);
  }, []);

  const realtime = useRealtimeOrders(restaurantId, {
    onInsert: (row) => {
      if (row.type === "DELIVERY") scheduleRefresh();
    },
    onUpdate: (row) => {
      if (row.type === "DELIVERY") scheduleRefresh();
    },
    onResync: scheduleRefresh,
  });

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refreshRef.current();
    }, FALLBACK_POLL_MS);
    const onFocus = () => void refreshRef.current();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  const setBusyFor = (id: string, kind: "status" | "payment" | null) => {
    const next = { ...busyRef.current };
    if (kind) next[id] = kind;
    else delete next[id];
    busyRef.current = next;
    setBusy(next);
  };

  const runAdvance = useCallback(
    async (order: DeliveryOrder): Promise<boolean> => {
      const to = order.status === "READY" ? "OUT_FOR_DELIVERY" : order.status === "OUT_FOR_DELIVERY" ? "DELIVERED" : null;
      if (!to || busyRef.current[order.id]) return false;
      setBusyFor(order.id, "status");
      const res = await advanceDeliveryOrderAction(restaurantId, order.id, to);
      if (res.ok) {
        const at = new Date().toISOString();
        setOrders((list) =>
          list.map((o) =>
            o.id === order.id
              ? { ...o, status: to, ...(to === "OUT_FOR_DELIVERY" ? { out_for_delivery_at: at } : { delivered_at: at }) }
              : o,
          ),
        );
        notify.success(to === "DELIVERED" ? `Pedido #${order.number} entregue` : `Pedido #${order.number} saiu para entrega`);
      } else {
        notify.error(res.error);
      }
      setBusyFor(order.id, null);
      void refresh();
      return res.ok;
    },
    [refresh, restaurantId],
  );

  const advance = useCallback(
    (order: DeliveryOrder) => {
      // Delivering with money still to collect is allowed (e.g. paid by card machine later) but asks first.
      if (order.status === "OUT_FOR_DELIVERY" && collectionFor(order)) {
        setConfirming(order);
        return;
      }
      void runAdvance(order);
    },
    [runAdvance],
  );

  const receive = useCallback(
    async (order: DeliveryOrder) => {
      if (!order.payment || busyRef.current[order.id]) return;
      setBusyFor(order.id, "payment");
      const res = await receiveDeliveryPaymentAction(restaurantId, order.payment.id);
      if (res.ok) {
        setOrders((list) =>
          list.map((o) => (o.id === order.id && o.payment ? { ...o, payment: { ...o.payment, status: "PAID" } } : o)),
        );
        notify.success(`Pagamento de ${formatMoney(order.payment.amount_cents)} recebido`);
      } else {
        notify.error(res.error);
      }
      setBusyFor(order.id, null);
      void refresh();
    },
    [refresh, restaurantId],
  );

  const sections = useMemo(() => splitDeliverySections(orders, Infinity), [orders]);
  const currentHistoryPage = Math.min(historyPage, Math.max(1, Math.ceil(sections.delivered.length / 10)));
  const historyRows = sections.delivered.slice((currentHistoryPage - 1) * 10, currentHistoryPage * 10);
  const connection: ConnectionState = pollFailed ? "offline" : realtime === "live" ? "live" : "connecting";

  const card = (o: DeliveryOrder, compact = false) => (
    <DeliveryOrderCard
      key={o.id}
      order={o}
      onTrack={()=>setTrackingOrder(o)}
      now={now}
      timeZone={timeZone}
      restaurantName={restaurantName}
      busy={busy[o.id] ?? null}
      onAdvance={advance}
      onReceive={receive}
      compact={compact}
    />
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <OpsHeader
        eyebrow="Entregas"
        restaurantName={restaurantName}
        connection={connection}
        clock={formatTime(new Date(now).toISOString(), timeZone)}
        showPanelLink={showPanelLink}
        actions={settings}
      />

      <main className="mx-auto flex w-full max-w-container flex-1 flex-col gap-6 px-4 py-5 sm:px-5">
        <p role="status" className="rounded-xl bg-surface-muted p-4 text-body-sm">Operação manual: confirme a saída, a entrega e o recebimento com o responsável e registre-os aqui. GPS e ofertas automáticas estão indisponíveis nesta BETA.</p>
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <Section title="Prontos para sair" icon={Store} count={sections.ready.length}>
            {sections.ready.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-line-strong bg-surface-subtle">
                <EmptyState icon={Store} title="Nada para retirar" description="Quando a cozinha marcar um pedido de entrega como pronto, ele aparece aqui." />
              </div>
            ) : (
              sections.ready.map((o) => card(o))
            )}
          </Section>

          <Section title="Em entrega" icon={Bike} count={sections.onRoute.length}>
            {sections.onRoute.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-line-strong bg-surface-subtle">
                <EmptyState icon={Bike} title="Nenhuma entrega em andamento" description="A equipe do restaurante registra a saída e a conclusão da entrega pelos botões do pedido." />
              </div>
            ) : (
              sections.onRoute.map((o) => card(o))
            )}
          </Section>
        </div>

        {sections.delivered.length > 0 && (
          <Section title="Entregas de hoje" icon={PackageCheck} count={sections.deliveredCount}>
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-body-sm text-ink-muted">Entregas concluídas hoje, incluindo cobranças pendentes.</p><SegmentedControl aria-label="Visualização das entregas de hoje" options={[{ value: "cards", label: "Cartões" }, { value: "list", label: "Lista" }]} value={historyView} onChange={setHistoryView} /></div>
            {historyView === "cards" ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{historyRows.map((o) => card(o, true))}</div> : <DataTable caption="Entregas de hoje" rows={historyRows} pageSize={0} getRowId={(o) => o.id} columns={[
              { key: "number", header: "Pedido", cell: (o) => `#${o.number}` },
              { key: "customer", header: "Cliente", cell: (o) => o.customer_name },
              { key: "delivered", header: "Entregue às", cell: (o) => o.delivered_at ? formatTime(o.delivered_at, timeZone) : "—" },
              { key: "total", header: "Valor", cell: (o) => formatMoney(o.total_cents) },
              { key: "payment", header: "Recebimento", cell: (o) => collectionFor(o) ? <Button variant="outline" disabled={Boolean(busy[o.id])} onClick={() => receive(o)}>Registrar recebimento #{o.number}</Button> : "Sem cobrança pendente" },
            ]} />}
            <Pagination page={currentHistoryPage} pageSize={10} total={sections.delivered.length} onChange={setHistoryPage} label="Entregas de hoje" />
          </Section>
        )}
      </main>

      <ResponsiveSheet open={!!trackingOrder} onOpenChange={(open)=>{if(!open)setTrackingOrder(null);}} title={trackingOrder ? "Acompanhamento do pedido #"+trackingOrder.number : "Acompanhamento"}>{trackingOrder && <OrderTrackingPanel order={trackingOrder}/>}</ResponsiveSheet>
      <ConfirmationDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={confirming ? `Marcar #${confirming.number} como entregue?` : ""}
        description="O pagamento na entrega ainda não foi registrado. Você pode registrá-lo depois em “Entregues hoje”."
        confirmLabel="Marcar entregue"
        onConfirm={async () => {
          if (!confirming) return;
          const ok = await runAdvance(confirming);
          if (!ok) throw new Error("advance failed");
        }}
      />
    </div>
  );
}
