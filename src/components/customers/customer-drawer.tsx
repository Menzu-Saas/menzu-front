"use client";

import { ChevronRight, MapPin, MessageCircle, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Drawer, EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/customers";
import { formatMoney } from "@/lib/money";
import { ORDER_TYPE_LABEL } from "@/lib/order-status";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { getCustomerDetailAction, type CustomerDetail } from "@/server/actions/customers";

type LoadState = { id: string; customer: CustomerDetail | null; error: string | null };

/** Customer profile drawer: stat tiles (reference "09 · Perfil"), details and order history linking to the order drawer. */
export function CustomerDrawer({
  customerId,
  fallbackName,
  timeZone,
  onOpenChange,
}: {
  customerId: string | null;
  fallbackName?: string;
  timeZone: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<LoadState | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    getCustomerDetailAction(customerId)
      .then((res) => {
        if (cancelled) return;
        setState(res.ok ? { id: customerId, customer: res.customer, error: null } : { id: customerId, customer: null, error: res.error });
      })
      .catch(() => {
        if (!cancelled) setState({ id: customerId, customer: null, error: "Não foi possível carregar o cliente." });
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Keep showing the last customer while the drawer animates out.
  const current = state && (customerId == null || state.id === customerId) ? state : null;
  const customer = current?.customer ?? null;
  const loading = customerId != null && current == null;
  const name = customer?.name ?? fallbackName ?? "Cliente";

  return (
    <Drawer
      open={customerId != null}
      onOpenChange={onOpenChange}
      title={name}
      description={customer ? formatPhone(customer.phone) : undefined}
      width="md"
      footer={
        customer ? (
          <Button asChild variant="outline" size="md">
            <a href={whatsappLink(customer.phone, `Olá, ${customer.name.split(" ")[0]}!`)} target="_blank" rel="noreferrer">
              <MessageCircle size={18} strokeWidth={1.8} aria-hidden="true" />
              Chamar no WhatsApp
            </a>
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <DrawerSkeleton />
      ) : current?.error ? (
        <EmptyState icon={Receipt} title="Cliente indisponível" description={current.error} />
      ) : customer ? (
        <div className="flex flex-col gap-5.5">
          {/* Stat tiles: sunken r16, value 19/800 (reference profile), stepping down in narrow tiles; coupons tile in brand tint. */}
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile value={String(customer.orders_count)} label={customer.orders_count === 1 ? "pedido" : "pedidos"} />
            <StatTile value={formatMoney(customer.avg_ticket_cents).replace(/,00$/, "")} label="ticket médio" />
            <StatTile
              value={String(customer.coupons_used)}
              label={customer.coupons_used === 1 ? "cupom" : "cupons"}
              brand
            />
          </div>

          <dl className="flex flex-col">
            <DetailRow label="Total gasto" value={formatMoney(customer.total_spent_cents)} strong />
            <DetailRow
              label="Última compra"
              value={customer.last_order_at ? formatDateTime(customer.last_order_at, timeZone) : "—"}
            />
            <DetailRow label="Cliente desde" value={formatDate(customer.created_at, timeZone)} />
            {customer.email && <DetailRow label="E-mail" value={customer.email} />}
          </dl>

          {customer.addresses.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-item font-extrabold text-ink">Endereços</h3>
              <ul className="flex flex-col gap-2">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5 text-body-sm text-ink-secondary">
                    <MapPin size={16} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-subtle" />
                    <span>
                      {a.street}, {a.number}
                      {a.complement ? ` · ${a.complement}` : ""}
                      <span className="block text-caption text-ink-muted">
                        {a.neighborhood} · {a.city}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h3 className="text-item font-extrabold text-ink">Histórico de pedidos</h3>
            {customer.orders.length === 0 ? (
              <p className="text-body-sm font-normal text-ink-muted">Nenhum pedido registrado.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {customer.orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/painel/pedidos?pedido=${o.id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3 text-ink transition-[border-color] duration-150 ease-out hover:border-line-strong hover:text-ink"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-body-sm font-medium text-ink">#{o.number}</span>
                          <StatusBadge status={o.status} size="sm" />
                        </div>
                        <span className="text-caption text-ink-muted">
                          {formatDateTime(o.created_at, timeZone)} · {ORDER_TYPE_LABEL[o.type]}
                        </span>
                      </div>
                      <span className="whitespace-nowrap text-body font-extrabold tabular-nums">{formatMoney(o.total_cents)}</span>
                      <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-ink-ghost group-hover:text-ink-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {customer.orders.length >= 50 && (
              <p className="text-caption text-ink-muted">Mostrando os 50 pedidos mais recentes.</p>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

function StatTile({ value, label, brand = false }: { value: string; label: string; brand?: boolean }) {
  return (
    <div className={cn("@container min-w-0 rounded-2xl p-3.5", brand ? "bg-brand-tint" : "bg-surface-sunken")}>
      <p
        title={value}
        className={cn(
          "truncate text-title-sm tabular-nums @max-[6rem]:text-subheading @max-[4rem]:text-body-sm @max-[4rem]:font-extrabold",
          brand ? "text-brand" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="text-caption text-ink-muted">{label}</p>
    </div>
  );
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
      <dt className="text-body-sm font-normal text-ink-muted">{label}</dt>
      <dd className={strong ? "text-body font-extrabold text-ink" : "text-body-sm text-ink"}>{value}</dd>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-5.5" aria-busy="true" aria-label="Carregando cliente">
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-17" radius="2xl" />
        ))}
      </div>
      <Skeleton className="h-4 w-2/3" radius="sm" />
      <Skeleton className="h-4 w-1/2" radius="sm" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-15" radius="2xl" />
      ))}
    </div>
  );
}
