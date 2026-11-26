import type { Metadata } from "next";
import { CouponsView } from "@/components/coupons/coupons-view";
import type { CouponPerformance, CouponRow } from "@/components/coupons/types";
import { parsePeriod, periodRange, type DashboardPeriod } from "@/lib/dashboard";
import { COUPON_ROLES } from "@/lib/schemas/coupon";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { getRestaurantClock } from "@/server/queries/dashboard";
import { isPreviewRestaurant, previewCoupons } from "@/lib/restaurant-preview";

export const metadata: Metadata = { title: "Cupons" };

/** Coupons (reference P4): active campaigns, performance in the period and the full coupon table. OWNER/MANAGER. */
export default async function CuponsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { restaurantId, restaurant } = await requireMember(COUPON_ROLES);
  const raw = (await searchParams).periodo;
  // Default to 30 days here: coupon results are rarely meaningful for "today" alone.
  const period: DashboardPeriod = raw ? parsePeriod(raw) : "30d";
  const supabase = await createSupabaseServerClient();
  const clock = await getRestaurantClock(restaurantId);
  const range = periodRange(period, new Date(), clock.timezone);

  const [coupons, orders, entitlements] = await Promise.all([
    supabase
      .from("coupons")
      .select(
        "id, code, description, type, value, min_order_cents, max_discount_cents, starts_at, ends_at, usage_limit, per_customer_limit, used_count, is_active, is_public, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("discount_cents, total_cents")
      .eq("restaurant_id", restaurantId)
      .not("coupon_id", "is", null)
      .neq("status", "CANCELLED")
      .gte("created_at", range.from.toISOString())
      .lt("created_at", range.to.toISOString())
      .limit(10_000),
    supabase.rpc("restaurant_entitlements", { p_restaurant_id: restaurantId }),
  ]);
  if (coupons.error) throw new Error(`Failed to load coupons: ${coupons.error.message}`);
  if (orders.error) throw new Error(`Failed to load coupon performance: ${orders.error.message}`);

  if (entitlements.error) throw new Error("Failed to load coupon plan permissions.");
  const plan = entitlements.data as { features?: Record<string, { enabled?: boolean }> } | null;
  const canUseAdvanced = plan?.features?.["coupons.advanced"]?.enabled === true;

  const rows: CouponRow[] = (coupons.data ?? []).map((c) => ({ ...c, code: String(c.code) }));
  const performance: CouponPerformance = (orders.data ?? []).reduce(
    (acc, o) => ({
      orders: acc.orders + 1,
      discount_cents: acc.discount_cents + o.discount_cents,
      revenue_cents: acc.revenue_cents + o.total_cents,
    }),
    { orders: 0, discount_cents: 0, revenue_cents: 0 },
  );

  const preview = rows.length === 0 && isPreviewRestaurant(restaurant);
  return <>
    {preview && <p className="mb-3 text-caption text-ink-muted">Dados de demonstração · somente visualização</p>}
    <CouponsView coupons={preview ? previewCoupons : rows} performance={performance} period={period} timeZone={clock.timezone} canUseAdvanced={canUseAdvanced} />
  </>;
}
