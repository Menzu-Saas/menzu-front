import { periodRange, type DashboardPeriod } from "@/lib/dashboard";
import { previewOrders, previewReport } from "@/lib/restaurant-preview";
import { getDashboardData, getRecentOrders } from "@/server/queries/dashboard";
import { MetricsGrid, MetricsGridSkeleton } from "./metrics-grid";
import { RecentOrders, RecentOrdersSkeleton } from "./recent-orders";
import { SalesChart, SalesChartSkeleton } from "./sales-chart";
import { TopProducts, TopProductsSkeleton } from "./top-products";

const ROW = "flex flex-wrap gap-4.5";

/** Async body of the dashboard (streamed inside Suspense; the header renders first). */
export async function DashboardContent({
  restaurantId,
  period,
  timeZone,
  preview = false,
}: {
  restaurantId: string;
  period: DashboardPeriod;
  timeZone: string;
  preview?: boolean;
}) {
  const now = new Date();
  const { from, to } = periodRange(period, now, timeZone);
  const sample = preview ? previewReport(from, to, timeZone, now) : null;
  const [data, recent] = sample ? [
    { ...sample, byHour: Array.from({ length: 24 }, (_, hour) => ({
      ...(sample.byHour.find((bucket) => bucket.hour === hour) ?? { revenue_cents: 0, orders: 0 }),
      label: `${String(hour).padStart(2, "0")}h`,
    })), byDay: sample.byDay.map((bucket) => ({ ...bucket, label: bucket.day })) },
    previewOrders(now).slice(0, 8).map(({ order }) => order),
  ] : await Promise.all([
    getDashboardData(restaurantId, period, timeZone),
    getRecentOrders(restaurantId),
  ]);
  return (
    <>
      {preview && <p className="text-caption text-ink-muted">Dados de demonstração · indicadores e pedidos fictícios</p>}
      <MetricsGrid period={period} current={data.current} previous={data.previous} />
      <div className={ROW}>
        <SalesChart period={period} byHour={data.byHour} byDay={data.byDay} />
        <TopProducts products={data.topProducts} />
      </div>
      <RecentOrders orders={recent} timeZone={timeZone} />
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Carregando indicadores" className="contents">
      <MetricsGridSkeleton />
      <div className={ROW}>
        <SalesChartSkeleton />
        <TopProductsSkeleton />
      </div>
      <RecentOrdersSkeleton />
    </div>
  );
}
