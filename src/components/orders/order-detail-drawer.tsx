"use client";

import { MessageCircle, Printer, SearchX, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Icon,
  PaymentStatusBadge,
  Skeleton,
  StatusBadge,
  notify,
} from "@/components/ui";
import { formatMoney } from "@/lib/money";
import {
  boardPrimaryAction,
  boardTypeLabel,
  canCancel,
  formatDateTime,
  PAYMENT_METHOD_LABEL,
  type BoardAction,
} from "@/lib/order-board";
import type { MemberRole } from "@/lib/order-status";
import { formatPhone, whatsappLink } from "@/lib/phone";
import {
  getOrderDetailAction,
  markPaymentPaidAction,
  simulatePaymentAction,
} from "@/server/actions/orders";
import type { OrderDetail } from "@/server/orders/queries";
import { OrderStatusTimeline } from "./order-status-timeline";

type LoadState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "missing" } | { kind: "ready"; order: OrderDetail };

export interface OrderDetailDrawerProps {
  restaurantId: string;
  orderId: string | null;
  role: MemberRole;
  timeZone: string;
  /** Board clock (ms) and the restaurant's average prep time, for the scheduled-order action. */
  now: number;
  avgPrepMinutes: number;
  /** Bumped by the board when the open order changed (realtime or own action): refetches. */
  version: number;
  devPayments: boolean;
  busy: boolean;
  onClose: () => void;
  onAction: (order: OrderDetail, action: BoardAction) => void;
  onCancel: (order: OrderDetail) => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="eyebrow text-ink-subtle">{title}</h3>
      {children}
    </section>
  );
}

function addressLines(order: OrderDetail): string[] {
  const a = order.address;
  if (!a) return [];
  const line1 = [a.street, a.number].filter(Boolean).join(", ");
  return [
    [line1, a.complement].filter(Boolean).join(" · "),
    [a.neighborhood, [a.city, a.state].filter(Boolean).join("/")].filter(Boolean).join(" · "),
    a.cep ? `CEP ${a.cep}` : "",
    a.reference ? `Referência: ${a.reference}` : "",
  ].filter(Boolean);
}

function TotalsRow({ label, value, strong = false }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "text-body font-extrabold text-ink" : "text-body-sm font-semibold text-ink-muted"}>{label}</span>
      <span className={strong ? "text-item font-extrabold text-ink" : "text-body-sm text-ink"}>{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Carregando pedido">
      <Skeleton className="h-20" radius="3xl" />
      <Skeleton className="h-16" radius="3xl" />
      <Skeleton className="h-36" radius="3xl" />
      <Skeleton className="h-28" radius="3xl" />
    </div>
  );
}

/** Right drawer with everything about one order (opened from the board or `?pedido=<id>`). */
export function OrderDetailDrawer({
  restaurantId,
  orderId,
  role,
  timeZone,
  now,
  avgPrepMinutes,
  version,
  devPayments,
  busy,
  onClose,
  onAction,
  onCancel,
}: OrderDetailDrawerProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [paying, setPaying] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    getOrderDetailAction(orderId).then(
      (res) => {
        if (!alive) return;
        if (!res.ok) setState({ kind: "error", message: res.error });
        else setState(res.data ? { kind: "ready", order: res.data } : { kind: "missing" });
      },
      () => alive && setState({ kind: "error", message: "Não foi possível carregar o pedido." }),
    );
    return () => {
      alive = false;
    };
  }, [orderId, version, reload]);

  // Show the skeleton when switching to another order (not on background refreshes of the same one).
  const [shownId, setShownId] = useState(orderId);
  if (orderId !== shownId) {
    setShownId(orderId);
    setState({ kind: "loading" });
  }

  const order = state.kind === "ready" ? state.order : null;
  const payment = order?.payment ?? null;
  const primary = order ? boardPrimaryAction(order, role, { now, avgPrepMinutes }) : null;
  const cancellable = order ? canCancel(order, role) : false;
  const canMarkPaid =
    !!payment && payment.provider === "offline" && payment.status === "PENDING" && order?.status !== "CANCELLED";
  const canSimulate =
    devPayments &&
    !!payment &&
    payment.provider === "development" &&
    (payment.status === "PENDING" || payment.status === "PROCESSING") &&
    order?.status !== "CANCELLED" &&
    (role === "OWNER" || role === "MANAGER");
  const paidAfterCancel = order?.status === "CANCELLED" && payment?.status === "PAID";

  async function runPayment(kind: "paid" | "simulate") {
    if (!payment) return;
    setPaying(true);
    const res = kind === "paid" ? await markPaymentPaidAction(restaurantId, payment.id) : await simulatePaymentAction(payment.id);
    setPaying(false);
    if (!res.ok) {
      notify.error(res.error);
      return;
    }
    notify.success(kind === "paid" ? "Pagamento registrado" : "Pagamento simulado como pago");
    setReload((n) => n + 1);
  }

  const header = order ? (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-title-md font-medium text-brand">#{order.number}</span>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-body-sm font-normal text-ink-muted">Recebido em {formatDateTime(order.created_at, timeZone)}</p>
    </div>
  ) : undefined;

  const footer = order ? (
    <>
      <Button variant="outline" asChild>
        <a href={`/painel/pedidos/${order.id}/imprimir?autoprint=1`} target="_blank" rel="noopener">
          <Icon icon={Printer} size={18} />
          Imprimir
        </a>
      </Button>
      {cancellable && (
        <Button variant="outline" className="text-danger" disabled={busy} onClick={() => onCancel(order)}>
          {order.status === "PENDING" ? "Recusar" : "Cancelar pedido"}
        </Button>
      )}
      {primary && (
        <Button variant={primary.variant} className="font-extrabold" loading={busy} onClick={() => onAction(order, primary)}>
          {primary.label}
        </Button>
      )}
    </>
  ) : undefined;

  return (
    <Drawer
      open={orderId != null}
      onOpenChange={(open) => !open && onClose()}
      width="lg"
      title={order ? `Pedido #${order.number}` : "Pedido"}
      header={header}
      footer={footer}
    >
      {state.kind === "loading" && <DetailSkeleton />}
      {state.kind === "missing" && (
        <EmptyState
          icon={SearchX}
          title="Pedido não encontrado"
          description="Ele não existe ou pertence a outro restaurante."
          action={
            <Button variant="outline" onClick={onClose}>
              Voltar para os pedidos
            </Button>
          }
        />
      )}
      {state.kind === "error" && (
        <EmptyState
          icon={TriangleAlert}
          title="Não foi possível carregar o pedido"
          description={state.message}
          action={
            <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
              Tentar novamente
            </Button>
          }
        />
      )}
      {order && (
        <div className="flex flex-col gap-6">
          {paidAfterCancel && (
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-warning-soft px-3.5 py-3">
              <Icon icon={TriangleAlert} size={20} className="text-warning" />
              <div className="flex flex-col gap-1.5">
                <Badge tone="warning" className="self-start bg-surface">
                  Pago após cancelamento — estornar
                </Badge>
                <p className="text-caption text-ink-secondary">
                  O pagamento foi confirmado depois do cancelamento. Faça o estorno ao cliente.
                </p>
              </div>
            </div>
          )}
          {order.status === "CANCELLED" && order.cancel_reason && (
            <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-body-sm text-danger">
              Motivo do cancelamento: {order.cancel_reason}
            </p>
          )}

          <Section title="Cliente">
            <div className="flex items-center gap-3 rounded-3xl border border-line p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-bold text-ink">{order.customer_name}</p>
                <p className="text-caption text-ink-muted">
                  {formatPhone(order.customer_phone)}
                  {order.customer_orders_count != null &&
                    ` · ${order.customer_orders_count <= 1 ? "Primeiro pedido" : `${order.customer_orders_count} pedidos`}`}
                </p>
              </div>
              <a
                href={whatsappLink(order.customer_phone, `Olá, ${order.customer_name.split(" ")[0]}! Sobre o seu pedido #${order.number}:`)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Conversar com ${order.customer_name} no WhatsApp`}
                title="WhatsApp"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-brand-soft-border bg-brand-soft text-brand transition-colors duration-150 hover:bg-brand-badge"
              >
                <Icon icon={MessageCircle} size={20} />
              </a>
            </div>
          </Section>

          <Section title={order.type === "DELIVERY" ? "Entregar em" : order.type === "PICKUP" ? "Retirada" : "Consumo no local"}>
            <div className="flex flex-col gap-1 text-body-sm text-ink-secondary">
              {order.type === "DELIVERY" &&
                addressLines(order).map((line) => (
                  <p key={line} className="first:text-body first:font-bold first:text-ink">
                    {line}
                  </p>
                ))}
              {order.type === "PICKUP" && <p>Cliente retira no balcão.</p>}
              {order.type === "DINE_IN" && <p className="text-body font-bold text-ink">{boardTypeLabel(order)}</p>}
              {order.scheduled_for && (
                <Badge tone="info" className="mt-1 self-start">
                  Agendado · {formatDateTime(order.scheduled_for, timeZone)}
                </Badge>
              )}
              {order.notes && (
                <p className="mt-1 rounded-xl bg-surface-sunken px-3.5 py-3 text-caption text-ink-secondary">
                  <span className="font-bold">Observações:</span> {order.notes}
                </p>
              )}
            </div>
          </Section>

          <Section title="Itens">
            <ul className="flex flex-col divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 py-2.5 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body text-ink">
                      <span className="font-extrabold">{item.quantity}x</span> {item.product_name}
                      {item.variant_name && <span className="text-ink-muted"> · {item.variant_name}</span>}
                    </p>
                    <span className="text-body-sm text-ink">{formatMoney(item.total_cents)}</span>
                  </div>
                  {item.addons.map((a) => (
                    <p key={a.id} className="pl-5 text-caption text-ink-muted">
                      + {a.quantity > 1 ? `${a.quantity}x ` : ""}
                      {a.option_name}
                      <span className="text-ink-faint"> · {a.group_name}</span>
                    </p>
                  ))}
                  {item.notes && <p className="pl-5 text-caption text-ink-secondary">Obs.: {item.notes}</p>}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 rounded-2xl bg-surface-sunken p-3.5">
              <TotalsRow label="Subtotal" value={formatMoney(order.subtotal_cents)} />
              {order.discount_cents > 0 && (
                <TotalsRow
                  label={
                    <>
                      Desconto
                      {order.coupon_code && (
                        <span className="ml-1.5 rounded-sm border border-dashed border-brand-dashed bg-brand-tint px-1.5 py-0.5 font-mono text-micro font-medium text-brand">
                          {order.coupon_code}
                        </span>
                      )}
                    </>
                  }
                  value={`− ${formatMoney(order.discount_cents)}`}
                />
              )}
              {order.type === "DELIVERY" && (
                <TotalsRow
                  label="Taxa de entrega"
                  value={order.delivery_fee_cents > 0 ? formatMoney(order.delivery_fee_cents) : "Grátis"}
                />
              )}
              <div className="my-0.5 border-t border-line" />
              <TotalsRow label="Total" value={formatMoney(order.total_cents)} strong />
            </div>
          </Section>

          <Section title="Pagamento">
            <div className="flex flex-col gap-3 rounded-3xl border border-line p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body font-bold text-ink">{PAYMENT_METHOD_LABEL[order.payment_method]}</p>
                {payment && (
                  <span className="flex items-center gap-1.5">
                    {payment.simulated && <Badge tone="warning">Simulado</Badge>}
                    <PaymentStatusBadge status={payment.status} />
                  </span>
                )}
              </div>
              {order.payment_method === "CASH" && order.change_for_cents != null && order.change_for_cents > order.total_cents && (
                <p className="text-caption text-ink-muted">
                  Troco para {formatMoney(order.change_for_cents)} · levar{" "}
                  <span className="font-bold text-ink">{formatMoney(order.change_for_cents - order.total_cents)}</span>
                </p>
              )}
              {payment?.paid_at && (
                <p className="text-caption text-ink-muted">Pago em {formatDateTime(payment.paid_at, timeZone)}</p>
              )}
              {(canMarkPaid || canSimulate) && (
                <div className="flex flex-wrap gap-2">
                  {canMarkPaid && (
                    <Button variant="success" size="sm" loading={paying} onClick={() => runPayment("paid")}>
                      Marcar como pago
                    </Button>
                  )}
                  {canSimulate && (
                    <Button variant="soft" size="sm" loading={paying} onClick={() => runPayment("simulate")}>
                      Simular pagamento (dev)
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section title="Histórico">
            <OrderStatusTimeline history={order.history} status={order.status} type={order.type} timeZone={timeZone} />
          </Section>
        </div>
      )}
    </Drawer>
  );
}
