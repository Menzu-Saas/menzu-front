import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { ReportRangeControl } from "@/components/reports/report-range-control";
import {
  PaymentSplit,
  ReportMetrics,
  ReportSkeleton,
  RevenueChart,
  StatusBreakdown,
  TopProductsTable,
} from "@/components/reports/report-sections";
import { Button, Icon, PageHeader } from "@/components/ui";
import { zonedParts } from "@/lib/dashboard";
import { parseReportRange, rangeLabel, rangeQuery, type ReportRange } from "@/lib/reports";
import { requireMember } from "@/server/auth";
import { getRestaurantClock } from "@/server/queries/dashboard";
import { getReportData } from "@/server/queries/reports";
import { isPreviewRestaurant, previewReport } from "@/lib/restaurant-preview";

export const metadata: Metadata = { title: "Relatórios" };

const pad = (n: number) => String(n).padStart(2, "0");

async function ReportBody({ restaurantId, range, preview, timeZone }: { restaurantId: string; range: ReportRange; preview: boolean; timeZone: string }) {
  const data = preview ? previewReport(range.from, range.to, timeZone) : await getReportData(restaurantId, range);
  return (
    <>
      <ReportMetrics data={data} />
      <div className="grid items-start gap-4.5 lg:grid-cols-2">
        <RevenueChart data={data} days={range.days} />
        <StatusBreakdown data={data} />
        <PaymentSplit data={data} />
        <TopProductsTable data={data} />
      </div>
    </>
  );
}

/** Relatórios: period presets / custom range, KPIs, revenue chart, status, payments, top products, CSV. */
export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { restaurantId, restaurant } = await requireMember(MANAGEMENT_ROLES);
  const preview = isPreviewRestaurant(restaurant);
  const clock = await getRestaurantClock(restaurantId);
  const now = new Date();
  const range = parseReportRange(await searchParams, now, clock.timezone);
  const t = zonedParts(now, clock.timezone);
  const today = `${t.year}-${pad(t.month)}-${pad(t.day)}`;
  const query = rangeQuery(range);

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title="Relatórios"
        description={
          range.invalid
            ? "Período inválido — mostrando os últimos 7 dias"
            : `${rangeLabel(range)} · ${range.days} ${range.days === 1 ? "dia" : "dias"}`
        }
        actions={
          <>
            <ReportRangeControl preset={range.preset} fromDay={range.fromDay} toDay={range.toDay} today={today} />
            {!preview && <Button asChild variant="outline" size="md">
              <a href={`/painel/relatorios/exportar?${query}`} download>
                <Icon icon={Download} size={18} />
                Exportar CSV
              </a>
            </Button>}
          </>
        }
      />
      {preview && <p className="text-caption text-ink-muted">Dados de demonstração · relatório fictício</p>}
      <Suspense key={query} fallback={<ReportSkeleton />}>
        <ReportBody restaurantId={restaurantId} range={range} preview={preview} timeZone={clock.timezone} />
      </Suspense>
    </div>
  );
}
