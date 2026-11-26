import { MetricCard } from "@/components/ui";
import {
  countDelta,
  formatMoneyShort,
  minutesDelta,
  PERIOD_COMPARISON,
  percentDelta,
  type DashboardPeriod,
} from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import type { PeriodMetrics } from "@/server/queries/dashboard";

const GRID = "grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5";

const LABELS = ["Faturamento", "Pedidos", "Ticket médio", "Clientes", "Tempo médio"] as const;

export interface MetricsGridProps {
  period: DashboardPeriod;
  current: PeriodMetrics;
  /** Null when the comparison window failed to load: the cards show "—" instead of a delta. */
  previous: PeriodMetrics | null;
}

const NO_COMPARISON = { text: "—", tone: "neutral" } as const;

/** Five KPI cards (reference P1) with the change against the previous window of the same length. */
export function MetricsGrid({ period, current, previous: loaded }: MetricsGridProps) {
  const vs = PERIOD_COMPARISON[period];
  const previous = loaded ?? current;
  const cards = [
    {
      label: LABELS[0],
      value: formatMoneyShort(current.revenue_cents),
      delta: percentDelta(current.revenue_cents, previous.revenue_cents, vs),
    },
    {
      label: LABELS[1],
      value: String(current.orders_count),
      delta: countDelta(current.orders_count, previous.orders_count, vs),
    },
    {
      label: LABELS[2],
      value: formatMoney(current.avg_ticket_cents),
      delta: percentDelta(current.avg_ticket_cents, previous.avg_ticket_cents, vs),
    },
    {
      label: LABELS[3],
      value: String(current.customers_count),
      delta: countDelta(current.customers_count, previous.customers_count, vs),
    },
    {
      label: LABELS[4],
      value: current.avg_prep_minutes > 0 ? `${current.avg_prep_minutes} min` : "—",
      delta: minutesDelta(current.avg_prep_minutes, previous.avg_prep_minutes),
    },
  ];
  if (!loaded) for (const card of cards) card.delta = NO_COMPARISON;
  return (
    <section aria-label="Indicadores" className={GRID}>
      {cards.map((card, i) => (
        <MetricCard
          key={card.label}
          label={card.label}
          value={card.value}
          delta={card.delta}
          className={i === cards.length - 1 ? "col-span-2 xl:col-span-1" : undefined}
        />
      ))}
    </section>
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className={GRID} aria-hidden="true">
      {LABELS.map((label, i) => (
        <MetricCard key={label} label={label} value="" loading className={i === LABELS.length - 1 ? "col-span-2 xl:col-span-1" : undefined} />
      ))}
    </div>
  );
}
