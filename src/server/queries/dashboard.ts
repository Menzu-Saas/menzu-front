import "server-only";

import { cache } from "react";
import {
  periodRange,
  type DashboardPeriod,
  type OpeningWindow,
} from "@/lib/dashboard";
import type { OrderStatus, OrderType } from "@/lib/order-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_TZ = "America/Sao_Paulo";

export interface RestaurantClock {
  timezone: string;
  hours: OpeningWindow[];
}

/** Restaurant timezone and opening hours (for the store status card and dashboard periods). */
export const getRestaurantClock = cache(async (restaurantId: string): Promise<RestaurantClock> => {
  const supabase = await createSupabaseServerClient();
  const [restaurant, hours] = await Promise.all([
    supabase.from("restaurants").select("timezone").eq("id", restaurantId).maybeSingle(),
    supabase.from("opening_hours").select("weekday, opens_at, closes_at").eq("restaurant_id", restaurantId),
  ]);
  if (hours.error) throw new Error(`Failed to load opening hours: ${hours.error.message}`);
  return { timezone: restaurant.data?.timezone || DEFAULT_TZ, hours: hours.data ?? [] };
});

/** Orders waiting for acceptance (sidebar "Pedidos" badge). */
export async function countPendingOrders(restaurantId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", "PENDING");
  if (error) return 0;
  return count ?? 0;
}

/** Display name of the logged-in user (profiles.full_name). */
export async function getProfileName(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name ?? null;
}

export interface PeriodMetrics {
  revenue_cents: number;
  orders_count: number;
  avg_ticket_cents: number;
  new_customers: number;
  customers_count: number;
  avg_prep_minutes: number;
}

export interface SalesBucket {
  label: string;
  revenue_cents: number;
  orders: number;
}

export interface TopProduct {
  product_id: string | null;
  name: string;
  quantity: number;
  revenue_cents: number;
  image_url: string | null;
}

export interface DashboardData {
  period: DashboardPeriod;
  current: PeriodMetrics;
  /** Null when the comparison window failed to load (the cards then show "—" instead of a delta). */
  previous: PeriodMetrics | null;
  byHour: SalesBucket[];
  byDay: (SalesBucket & { day: string })[];
  topProducts: TopProduct[];
}

interface RawMetrics extends PeriodMetrics {
  by_hour?: { hour: number; revenue_cents: number; orders: number }[] | null;
  by_day?: { day: string; revenue_cents: number; orders: number }[] | null;
  top_products?: TopProduct[] | null;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

function metricsOf(raw: RawMetrics): PeriodMetrics {
  return {
    revenue_cents: num(raw.revenue_cents),
    orders_count: num(raw.orders_count),
    avg_ticket_cents: num(raw.avg_ticket_cents),
    new_customers: num(raw.new_customers),
    customers_count: num(raw.customers_count),
    avg_prep_minutes: num(raw.avg_prep_minutes),
  };
}

/**
 * Metrics for the period via `dashboard_metrics` (OWNER/MANAGER only; RLS-free definer RPC that
 * re-checks the role). The previous window is fetched separately with the same elapsed length, so
 * "today so far" is compared with "yesterday until this time" instead of the whole day.
 */
export async function getDashboardData(
  restaurantId: string,
  period: DashboardPeriod,
  timezone: string,
  now: Date = new Date(),
): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const range = periodRange(period, now, timezone);
  const [cur, prev] = await Promise.all([
    supabase.rpc("dashboard_metrics", {
      p_restaurant_id: restaurantId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
    }),
    range.prevTo > range.prevFrom
      ? supabase.rpc("dashboard_metrics", {
          p_restaurant_id: restaurantId,
          p_from: range.prevFrom.toISOString(),
          p_to: range.prevTo.toISOString(),
        })
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (cur.error) throw new Error(`dashboard_metrics failed: ${cur.error.message}`);
  const raw = (cur.data ?? {}) as unknown as RawMetrics;
  const prevRaw = (prev.data ?? {}) as unknown as RawMetrics;
  if (prev.error) console.error(`dashboard_metrics (previous window) failed: ${prev.error.message}`);

  return {
    period,
    current: metricsOf(raw),
    previous: prev.error ? null : metricsOf(prevRaw),
    byHour: (raw.by_hour ?? []).map((b) => ({
      label: `${b.hour}h`,
      revenue_cents: num(b.revenue_cents),
      orders: num(b.orders),
    })),
    byDay: (raw.by_day ?? []).map((b) => ({
      day: b.day,
      label: b.day,
      revenue_cents: num(b.revenue_cents),
      orders: num(b.orders),
    })),
    topProducts: (raw.top_products ?? []).map((p) => ({
      product_id: p.product_id,
      name: p.name,
      quantity: num(p.quantity),
      revenue_cents: num(p.revenue_cents),
      image_url: p.image_url,
    })),
  };
}

export interface RecentOrder {
  id: string;
  number: number;
  customer_name: string;
  total_cents: number;
  status: OrderStatus;
  type: OrderType;
  created_at: string;
}

/** Last five orders of the restaurant (any status). */
export async function getRecentOrders(restaurantId: string, limit = 5): Promise<RecentOrder[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, number, customer_name, total_cents, status, type, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load recent orders: ${error.message}`);
  return data ?? [];
}
