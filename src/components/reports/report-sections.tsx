import { ChartNoAxesColumnIncreasing, CreditCard, ListChecks, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { activeHourWindow } from "@/components/dashboard/sales-chart";
import {
  BarChart,
  Icon,
  ImagePlaceholder,
  MetricCard,
  rankLevels,
  Skeleton,
  TBody,
  TCell,
  THead,
  THeadCell,
  TRow,
  Table,
  type BarDatum,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { countDelta, formatMoneyShort, minutesDelta, percentDelta, WEEKDAY_SHORT } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/lib/order-status";
import { percentOf } from "@/lib/reports";
import { PAYMENT_METHOD_LABEL } from "@/lib/schemas/settings";
import type { ReportData } from "@/server/queries/reports";

export const PANEL = "flex min-w-0 flex-col gap-4 rounded-4xl border border-line bg-surface p-5";
const RAMP = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-chart-6"] as const;

function PanelTitle({ id, children, aside }: { id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-item font-extrabold text-ink">
        {children}
      </h2>
      {aside && <p className="text-caption font-semibold text-ink-muted">{aside}</p>}
    </div>
  );
}

function Empty({ icon, children }: { icon: typeof Trophy; children: ReactNode }) {
  return (
    <div className="flex min-h-30 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-sunken px-4 py-6 text-center">
      <Icon icon={icon} size={22} className="text-ink-faint" />
      <p className="text-body-sm font-semibold text-ink-muted">{children}</p>
    </div>
  );
}

const GRID = "grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5";

/** KPI row with the change against the previous window of the same length. */
export function ReportMetrics({ data }: { data: ReportData }) {
  const { current: c, previous: p } = data;
  const vs = "vs período anterior";
  const cards = [
    { label: "Faturamento", value: formatMoneyShort(c.revenue_cents), delta: percentDelta(c.revenue_cents, p.revenue_cents, vs) },
    { label: "Pedidos", value: String(c.orders_count), delta: countDelta(c.orders_count, p.orders_count, vs) },
    { label: "Ticket médio", value: formatMoney(c.avg_ticket_cents), delta: percentDelta(c.avg_ticket_cents, p.avg_ticket_cents, vs) },
    { label: "Novos clientes", value: String(c.new_customers), delta: countDelta(c.new_customers, p.new_customers, vs) },
    {
      label: "Tempo médio",
      value: c.avg_prep_minutes > 0 ? `${c.avg_prep_minutes} min` : "—",
      delta: minutesDelta(c.avg_prep_minutes, p.avg_prep_minutes),
    },
  ];
  return (
    <section aria-label="Indicadores do período" className={GRID}>
      {cards.map((card, i) => (
        <MetricCard
          key={card.label}
          {...card}
          className={i === cards.length - 1 ? "col-span-2 sm:col-span-1" : undefined}
        />
      ))}
    </section>
  );
}

function dayLabel(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  if (days <= 7) return WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return days > 31 ? `${d}/${m}` : String(d);
}

/** "Faturamento por dia" (by hour when the range is a single day). */
export function RevenueChart({ data, days }: { data: ReportData; days: number }) {
  const single = days === 1;
  const bars: BarDatum[] = single
    ? activeHourWindow(data.byHour.map((b) => ({ label: `${b.hour}h`, revenue_cents: b.revenue_cents, orders: b.orders }))).map(
        (b) => ({ label: b.label, value: b.revenue_cents }),
      )
    : data.byDay.map((b) => ({ label: dayLabel(b.day, days), value: b.revenue_cents }));
  const hasSales = bars.some((b) => b.value > 0);
  const title = single ? "Faturamento por hora" : "Faturamento por dia";
  const wide = bars.length > 14;

  return (
    <section aria-labelledby="revenue-chart-title" className={cn(PANEL, "lg:col-span-2")}>
      <PanelTitle id="revenue-chart-title" aside={`${data.current.orders_count} pedidos`}>
        {title}
      </PanelTitle>
      {!hasSales ? (
        <Empty icon={ChartNoAxesColumnIncreasing}>Nenhuma venda no período</Empty>
      ) : wide ? (
        // Many bars: scroll inside the card, starting at the most recent day (rtl trick).
        <div dir="rtl" className="-mx-1 -mt-8 overflow-x-auto px-1 pt-8 pb-2">
          <div dir="ltr" style={{ minWidth: `${bars.length * 1.75}rem` }}>
            <BarChart data={bars} label={title} formatValue={formatMoneyShort} className="gap-1.5" />
          </div>
        </div>
      ) : (
        <BarChart data={bars} label={title} formatValue={formatMoneyShort} />
      )}
    </section>
  );
}

/** Orders per status as horizontal bars (cancelled included, so the loss is visible). */
export function StatusBreakdown({ data }: { data: ReportData }) {
  const rows = ORDER_STATUSES.map((status) => ({
    status,
    count: data.byStatus.find((s) => s.status === status)?.count ?? 0,
  })).filter((r) => r.count > 0);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(0, ...rows.map((r) => r.count));
  const levels = rankLevels(rows.map((r) => r.count));

  return (
    <section aria-labelledby="status-title" className={PANEL}>
      <PanelTitle id="status-title" aside={`${total} no total`}>
        Pedidos por status
      </PanelTitle>
      {rows.length === 0 ? (
        <Empty icon={ListChecks}>Nenhum pedido no período</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <li key={r.status} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-body-sm">
                <span className="font-semibold text-ink">{ORDER_STATUS_LABEL[r.status]}</span>
                <span className="tabular-nums text-ink-secondary">
                  <span className="font-extrabold text-ink">{r.count}</span> · {percentOf(r.count, total)}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                <div
                  className={cn("h-full rounded-full", r.status === "CANCELLED" ? "bg-track-off" : RAMP[levels[i]])}
                  style={{ width: `${Math.max((r.count / max) * 100, 3)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Revenue split per payment method: one stacked bar + legend (orders, revenue, share). */
export function PaymentSplit({ data }: { data: ReportData }) {
  const rows = [...data.byPayment].sort((a, b) => b.revenue_cents - a.revenue_cents);
  const total = rows.reduce((sum, r) => sum + r.revenue_cents, 0);
  const levels = rankLevels(rows.map((r) => r.revenue_cents));

  return (
    <section aria-labelledby="payment-title" className={PANEL}>
      <PanelTitle id="payment-title" aside={formatMoneyShort(total)}>
        Formas de pagamento
      </PanelTitle>
      {rows.length === 0 ? (
        <Empty icon={CreditCard}>Nenhum pagamento no período</Empty>
      ) : (
        <>
          <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
            {rows.map((r, i) =>
              r.revenue_cents > 0 ? (
                <div
                  key={r.method}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", RAMP[levels[i]])}
                  style={{ width: `${(r.revenue_cents / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="flex flex-col">
            {rows.map((r, i) => (
              <li key={r.method} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", RAMP[levels[i]])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-bold text-ink">{PAYMENT_METHOD_LABEL[r.method] ?? r.method}</p>
                  <p className="text-micro font-normal text-ink-muted">
                    {r.count} {r.count === 1 ? "pedido" : "pedidos"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-body-sm font-extrabold tabular-nums text-ink">{formatMoney(r.revenue_cents)}</p>
                  <p className="text-micro font-normal tabular-nums text-ink-muted">{percentOf(r.revenue_cents, total)}%</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Top 10 products by quantity, with revenue and share of the period revenue. */
export function TopProductsTable({ data }: { data: ReportData }) {
  const list = data.topProducts.slice(0, 10);
  const revenue = data.current.revenue_cents;
  return (
    <section aria-labelledby="top-title" className={cn(PANEL, "lg:col-span-2")}>
      <PanelTitle id="top-title" aside="por quantidade">
        Top 10 produtos
      </PanelTitle>
      {list.length === 0 ? (
        <Empty icon={Trophy}>Nenhum produto vendido no período</Empty>
      ) : (
        <Table aria-label="Top 10 produtos">
          <THead>
            <TRow>
              <THeadCell className="w-6 sm:w-8">#</THeadCell>
              <THeadCell>Produto</THeadCell>
              <THeadCell className="hidden text-right sm:table-cell">Qtd.</THeadCell>
              <THeadCell className="text-right">Faturamento</THeadCell>
              <THeadCell className="hidden text-right sm:table-cell">% do total</THeadCell>
            </TRow>
          </THead>
          <TBody>
            {list.map((p, i) => (
              <TRow key={p.product_id ?? `${p.name}-${i}`}>
                <TCell className="tabular-nums text-ink-subtle">{i + 1}</TCell>
                <TCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- tenant uploads from Supabase Storage
                      <img src={p.image_url} alt="" className="hidden size-9 shrink-0 rounded-md object-cover sm:block" loading="lazy" />
                    ) : (
                      <ImagePlaceholder kind="food" className="hidden size-9 shrink-0 rounded-md sm:flex" />
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-bold text-ink">{p.name}</p>
                      <p className="text-micro font-normal text-ink-muted sm:hidden">
                        {p.quantity} {p.quantity === 1 ? "venda" : "vendas"} · {percentOf(p.revenue_cents, revenue)}%
                      </p>
                    </div>
                  </div>
                </TCell>
                <TCell className="hidden text-right tabular-nums sm:table-cell">{p.quantity}</TCell>
                <TCell className="text-right font-extrabold whitespace-nowrap tabular-nums">{formatMoney(p.revenue_cents)}</TCell>
                <TCell className="hidden text-right tabular-nums text-ink-secondary sm:table-cell">
                  {percentOf(p.revenue_cents, revenue)}%
                </TCell>
              </TRow>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}

export function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="contents">
      <div className={GRID} aria-hidden="true">
        {["Faturamento", "Pedidos", "Ticket médio", "Novos clientes", "Tempo médio"].map((label, i) => (
          <MetricCard key={label} label={label} value="" loading className={i === 4 ? "col-span-2 sm:col-span-1" : undefined} />
        ))}
      </div>
      <div className="grid gap-4.5 lg:grid-cols-2" aria-hidden="true">
        <div className={cn(PANEL, "lg:col-span-2")}>
          <Skeleton className="h-5 w-40" radius="sm" />
          <div className="flex h-37.5 items-end gap-3">
            {[38, 56, 88, 72, 44, 20, 64].map((h) => (
              <Skeleton key={h} className="flex-1 rounded-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        {[0, 1].map((k) => (
          <div key={k} className={PANEL}>
            <Skeleton className="h-5 w-36" radius="sm" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-4 w-full" radius="sm" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
