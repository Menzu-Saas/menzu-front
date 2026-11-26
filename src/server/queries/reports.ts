import "server-only";

import type { OrderStatus } from "@/lib/order-status";
import type { ReportRange } from "@/lib/reports";
import type { PaymentMethodValue } from "@/lib/schemas/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PeriodMetrics, TopProduct } from "./dashboard";

export interface ReportData {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  byDay: { day: string; revenue_cents: number; orders: number }[];
  byHour: { hour: number; revenue_cents: number; orders: number }[];
  byStatus: { status: OrderStatus; count: number }[];
  byPayment: { method: PaymentMethodValue; count: number; revenue_cents: number }[];
  topProducts: TopProduct[];
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

function metrics(raw: Record<string, unknown> | undefined): PeriodMetrics {
  return {
    revenue_cents: num(raw?.revenue_cents),
    orders_count: num(raw?.orders_count),
    avg_ticket_cents: num(raw?.avg_ticket_cents),
    new_customers: num(raw?.new_customers),
    customers_count: num(raw?.customers_count),
    avg_prep_minutes: num(raw?.avg_prep_minutes),
  };
}

type Raw = Record<string, unknown> & {
  previous?: Record<string, unknown>;
  by_day?: { day: string; revenue_cents: number; orders: number }[] | null;
  by_hour?: { hour: number; revenue_cents: number; orders: number }[] | null;
  by_status?: { status: OrderStatus; count: number }[] | null;
  by_payment?: { method: PaymentMethodValue; count: number; revenue_cents: number }[] | null;
  top_products?: TopProduct[] | null;
};

/**
 * Report for the range via `dashboard_metrics` (OWNER/MANAGER; the definer RPC re-checks the role).
 * `previous` is the window of the same length right before the range.
 */
export async function getReportData(restaurantId: string, range: ReportRange): Promise<ReportData> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("dashboard_metrics", {
    p_restaurant_id: restaurantId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });
  if (error) throw new Error(`dashboard_metrics failed: ${error.message}`);
  const raw = (data ?? {}) as unknown as Raw;
  return {
    current: metrics(raw),
    previous: metrics(raw.previous),
    byDay: (raw.by_day ?? []).map((b) => ({ day: b.day, revenue_cents: num(b.revenue_cents), orders: num(b.orders) })),
    byHour: (raw.by_hour ?? []).map((b) => ({ hour: num(b.hour), revenue_cents: num(b.revenue_cents), orders: num(b.orders) })),
    byStatus: (raw.by_status ?? []).map((s) => ({ status: s.status, count: num(s.count) })),
    byPayment: (raw.by_payment ?? []).map((p) => ({ method: p.method, count: num(p.count), revenue_cents: num(p.revenue_cents) })),
    topProducts: (raw.top_products ?? []).map((p) => ({
      product_id: p.product_id,
      name: p.name,
      quantity: num(p.quantity),
      revenue_cents: num(p.revenue_cents),
      image_url: p.image_url,
    })),
  };
}

export interface ExportOrder {
  number: number;
  created_at: string;
  status: OrderStatus;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  customer_name: string;
  customer_phone: string;
  table_number: number | null;
  payment_method: PaymentMethodValue;
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  cancel_reason: string | null;
  address: unknown;
  payments: { status: string }[] | null;
  coupon: { code: string } | null;
}

/** Hard cap on exported rows (one request); larger ranges should be split. */
export const EXPORT_LIMIT = 20_000;

/** Orders created in the range, oldest first, for the CSV export (RLS: staff of the restaurant). */
export async function getOrdersForExport(restaurantId: string, range: ReportRange): Promise<ExportOrder[]> {
  const supabase = await createSupabaseServerClient();
  const out: ExportOrder[] = [];
  const PAGE = 1000;
  for (let offset = 0; offset < EXPORT_LIMIT; offset += PAGE) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "number, created_at, status, type, customer_name, customer_phone, table_number, payment_method, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, cancel_reason, address, payments(status), coupon:coupons(code)",
      )
      .eq("restaurant_id", restaurantId)
      .gte("created_at", range.from.toISOString())
      .lt("created_at", range.to.toISOString())
      .order("created_at", { ascending: true })
      .order("number", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Failed to load orders for export: ${error.message}`);
    out.push(...((data ?? []) as unknown as ExportOrder[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}
