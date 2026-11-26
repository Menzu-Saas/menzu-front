import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { BarChart, Icon, Skeleton, type BarDatum } from "@/components/ui";
import { formatMoneyShort, WEEKDAY_SHORT, type DashboardPeriod } from "@/lib/dashboard";
import type { SalesBucket } from "@/server/queries/dashboard";

const PANEL = "flex min-w-0 flex-[2_1_20rem] flex-col gap-4 rounded-4xl border border-line bg-surface p-5";
/** Today's chart shows at least this many hours around the busy ones (reference: 18h – 23h). */
const MIN_HOURS = 6;

/** Hours that had sales, widened to MIN_HOURS so a quiet day still reads as a chart. */
export function activeHourWindow(byHour: SalesBucket[]): SalesBucket[] {
  const active = byHour.map((b, i) => (b.revenue_cents > 0 ? i : -1)).filter((i) => i >= 0);
  if (active.length === 0) return [];
  let start = active[0];
  let end = active[active.length - 1];
  while (end - start + 1 < MIN_HOURS) {
    if (end < byHour.length - 1) end++;
    if (end - start + 1 < MIN_HOURS && start > 0) start--;
  }
  return byHour.slice(start, end + 1);
}

function dayLabel(isoDay: string, period: DashboardPeriod): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  if (period === "7d") return WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return String(d);
}

export interface SalesChartProps {
  period: DashboardPeriod;
  byHour: SalesBucket[];
  byDay: (SalesBucket & { day: string })[];
}

/** "Vendas por hora" (today) or "Vendas por dia" (7/30 days), bars coloured by rank. */
export function SalesChart({ period, byHour, byDay }: SalesChartProps) {
  const today = period === "hoje";
  const buckets = today ? activeHourWindow(byHour) : byDay;
  const data: BarDatum[] = buckets.map((b) => ({
    label: today ? b.label : dayLabel((b as SalesBucket & { day: string }).day, period),
    value: b.revenue_cents,
  }));
  const hasSales = data.some((d) => d.value > 0);
  const title = today ? "Vendas por hora" : "Vendas por dia";
  const range = today
    ? hasSales
      ? `${data[0].label} – ${data[data.length - 1].label}`
      : "hoje"
    : period === "7d"
      ? "últimos 7 dias"
      : "últimos 30 dias";

  return (
    <section aria-labelledby="sales-chart-title" className={PANEL}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sales-chart-title" className="text-item font-extrabold text-ink">
          {title}
        </h2>
        <p className="text-caption font-semibold text-ink-muted">{range}</p>
      </div>
      {hasSales ? (
        period === "30d" ? (
          // 30 bars need ~800px: scroll inside the card, starting at the most recent day (rtl trick).
          <div dir="rtl" className="-mx-1 -mt-8 overflow-x-auto px-1 pt-8 pb-2">
            <div dir="ltr" className="min-w-200">
              <BarChart data={data} label={title} formatValue={formatMoneyShort} className="gap-1.5" />
            </div>
          </div>
        ) : (
          <BarChart data={data} label={title} formatValue={formatMoneyShort} className="flex-1" />
        )
      ) : (
        <div className="flex h-37.5 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-sunken text-center">
          <Icon icon={ChartNoAxesColumnIncreasing} size={22} className="text-ink-faint" />
          <p className="text-body-sm font-semibold text-ink-muted">
            {today ? "Nenhuma venda hoje ainda" : "Nenhuma venda no período"}
          </p>
        </div>
      )}
    </section>
  );
}

export function SalesChartSkeleton() {
  return (
    <div className={PANEL} aria-hidden="true">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-5 w-32" radius="sm" />
        <Skeleton className="h-3.5 w-16" radius="sm" />
      </div>
      <div className="flex h-37.5 items-end gap-3">
        {[38, 56, 88, 72, 44, 20].map((h) => (
          <Skeleton key={h} className="flex-1 rounded-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
