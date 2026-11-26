import type { CouponRow } from "@/components/coupons/types";
import type { AddonGroupRow } from "@/server/queries/menu";
import type { ReportData } from "@/server/queries/reports";
import type { RecentOrder } from "@/server/queries/dashboard";
import { zonedParts } from "@/lib/dashboard";

export const PREVIEW_ID = "preview:";

export function isPreviewRestaurant(restaurant: { name: string; slug: string }) {
  return restaurant.slug === "burger-house" || restaurant.name === "Buguer House";
}

export const previewCoupons: CouponRow[] = [{
  id: PREVIEW_ID + "welcome", code: "PRIMEIRACOMPRA", description: "Boas-vindas para novos clientes",
  type: "PERCENT", value: 10, min_order_cents: 5000, max_discount_cents: 1500,
  starts_at: null, ends_at: null, usage_limit: 100, per_customer_limit: 1, used_count: 8,
  is_active: true, created_at: "2026-01-01T00:00:00Z",
}];

export const previewAddonGroups: AddonGroupRow[] = [{
  id: PREVIEW_ID + "pasta", name: "Adicionais para massas", is_required: false,
  min_select: 0, max_select: 2, products: 1,
  options: [
    { id: PREVIEW_ID + "cheese", name: "Parmesão ralado", price_cents: 500, max_quantity: 1, is_available: true },
    { id: PREVIEW_ID + "sauce", name: "Molho ao sugo extra", price_cents: 700, max_quantity: 1, is_available: true },
  ],
}];

previewCoupons.push(...[
  { code: "MASSA15", description: "15% de desconto no pedido", value: 15, used_count: 12 },
  { code: "VOLTE10", description: "Desconto para a próxima compra", value: 10, used_count: 6 },
  { code: "JANTAR20", description: "Oferta para o jantar", value: 20, used_count: 4, is_active: false },
].map((coupon) => ({ ...previewCoupons[0], ...coupon, id: PREVIEW_ID + coupon.code })));

previewAddonGroups.push(...[
  { name: "Escolha o molho", options: [["Alfredo", 800], ["Pesto", 900], ["Bolonhesa", 1000]] as const },
  { name: "Para acompanhar", options: [["Pão de alho", 1200], ["Salada da casa", 1600]] as const },
].map(({ name, options }, index) => ({
  id: PREVIEW_ID + "group-" + index, name, is_required: false, min_select: 0, max_select: 2, products: 2,
  options: options.map(([name, price_cents], option) => ({
    id: PREVIEW_ID + index + "-" + option, name, price_cents, max_quantity: 1, is_available: true,
  })),
})));

export const previewDishes = [
  { name: "Lasanha à Bolonhesa", price_cents: 5890, image_url: "/preview-dishes/lasanha.jpg" },
  { name: "Ravioli de Ricota", price_cents: 5490, image_url: "/preview-dishes/ravioli.jpg" },
  { name: "Fettuccine Alfredo", price_cents: 4990, image_url: "/preview-dishes/fettuccine.jpg" },
  { name: "Penne ao Pesto", price_cents: 4590, image_url: "/preview-dishes/penne.jpg" },
  { name: "Risoto de Cogumelos", price_cents: 6290, image_url: "/preview-dishes/risoto.jpg" },
];

export const previewCustomers = ["Marina Costa", "Rafael Melo", "Beatriz Lima", "Lucas Rocha", "Camila Alves", "André Santos"];

export function previewOrders(now: Date) {
  return Array.from({ length: 90 }, (_, index) => {
    const dish = previewDishes[index % previewDishes.length];
    const quantity = 1 + index % 3;
    const order: RecentOrder = {
      id: PREVIEW_ID + index, number: 9090 - index, customer_name: previewCustomers[index % previewCustomers.length],
      status: index === 0 ? "PREPARING" : index === 1 ? "OUT_FOR_DELIVERY" : "DELIVERED",
      type: index % 3 === 1 ? "DELIVERY" : index % 3 === 2 ? "PICKUP" : "DINE_IN",
      total_cents: dish.price_cents * quantity,
      created_at: new Date(now.getTime() - (index + 1) * 6 * 3_600_000 / 10).toISOString(),
    };
    return { order, dish, quantity };
  });
}

export function previewReport(from: Date, to: Date, timeZone: string, now = new Date()): ReportData {
  const rows = previewOrders(now).filter(({ order }) => {
    const time = Date.parse(order.created_at);
    return time >= from.getTime() && time < to.getTime();
  });
  const revenue = rows.reduce((sum, { order }) => sum + order.total_cents, 0);
  const bucket = <T extends string | number>(key: (value: string) => T) => {
    const buckets = new Map<T, { revenue_cents: number; orders: number }>();
    for (const { order } of rows) {
      const value = key(order.created_at);
      const current = buckets.get(value) ?? { revenue_cents: 0, orders: 0 };
      buckets.set(value, { revenue_cents: current.revenue_cents + order.total_cents, orders: current.orders + 1 });
    }
    return [...buckets].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  };
  const current = {
    revenue_cents: revenue, orders_count: rows.length, avg_ticket_cents: rows.length ? Math.round(revenue / rows.length) : 0,
    new_customers: 0, customers_count: new Set(rows.map(({ order }) => order.customer_name)).size,
    avg_prep_minutes: rows.length ? 28 : 0,
  };
  return {
    current, previous: { revenue_cents: 0, orders_count: 0, avg_ticket_cents: 0, new_customers: 0, customers_count: 0, avg_prep_minutes: 0 },
    byHour: bucket((value) => zonedParts(new Date(value), timeZone).hour).map(([hour, totals]) => ({ hour, ...totals })),
    byDay: bucket((value) => new Intl.DateTimeFormat("sv-SE", { timeZone }).format(new Date(value))).map(([day, totals]) => ({ day, ...totals })),
    byStatus: (["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const).map((status) => ({
      status, count: rows.filter(({ order }) => order.status === status).length,
    })),
    byPayment: rows.length ? [{ method: "CASH", count: rows.length, revenue_cents: revenue }] : [],
    topProducts: previewDishes.map((dish) => {
      const quantity = rows.filter((row) => row.dish === dish).reduce((sum, row) => sum + row.quantity, 0);
      return { product_id: null, name: dish.name, quantity, revenue_cents: quantity * dish.price_cents, image_url: dish.image_url };
    }).filter((dish) => dish.quantity > 0).sort((a, b) => b.quantity - a.quantity),
  };
}
