import { ArrowRight, ReceiptText } from "lucide-react";
import Link from "next/link";
import { Icon, Skeleton, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { ORDER_TYPE_LABEL } from "@/lib/order-status";
import type { RecentOrder } from "@/server/queries/dashboard";

const PANEL = "flex min-w-0 flex-col gap-3 rounded-4xl border border-line bg-surface p-5";

function timeFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function Header() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id="recent-orders-title" className="text-item font-extrabold text-ink">
        Pedidos recentes
      </h2>
      <Link
        href="/painel/pedidos"
        className="inline-flex items-center gap-1 rounded-sm text-caption font-bold text-brand hover:text-accent"
      >
        Ver todos
        <Icon icon={ArrowRight} size={16} />
      </Link>
    </div>
  );
}

/** Last five orders: DM Mono number, customer, type · time, status badge and total. */
export function RecentOrders({ orders, timeZone }: { orders: RecentOrder[]; timeZone: string }) {
  const time = timeFormatter(timeZone);
  return (
    <section aria-labelledby="recent-orders-title" className={PANEL}>
      <Header />
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Icon icon={ReceiptText} size={22} className="text-ink-faint" />
          <p className="text-body-sm font-normal text-ink-muted">Os pedidos do seu cardápio aparecem aqui.</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-line py-3 first:border-t-0 sm:flex-nowrap"
            >
              <span className="w-13 shrink-0 font-mono text-body-sm font-medium text-ink">#{order.number}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-ink">{order.customer_name}</p>
                <p className="text-micro font-normal text-ink-muted">
                  {ORDER_TYPE_LABEL[order.type]} · {time.format(new Date(order.created_at))}
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-3.5 pl-16.5 sm:w-auto sm:pl-0">
                <StatusBadge status={order.status} size="sm" />
                <span className="min-w-18 text-right text-body-sm font-extrabold tabular-nums text-ink">
                  {formatMoney(order.total_cents)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentOrdersSkeleton() {
  return (
    <div className={PANEL} aria-hidden="true">
      <Skeleton className="h-5 w-36" radius="sm" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3.5 py-2">
          <Skeleton className="h-4 w-12" radius="sm" />
          <Skeleton className="h-4 flex-1" radius="sm" />
          <Skeleton className="h-5 w-20" radius="sm" />
        </div>
      ))}
    </div>
  );
}
