import "server-only";

import { BOARD_ORDER_SELECT, startOfDayInTimeZone, type BoardOrder } from "@/lib/order-board";
import type { OrderStatus } from "@/lib/order-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import type { Json, Order, PaymentMethod, PaymentStatus } from "@/lib/types";

const OPEN_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

/**
 * Orders shown on the board: every open order (whatever the day: an order left open yesterday must
 * not disappear) plus the orders delivered or cancelled today in the restaurant's timezone.
 */
export async function listBoardOrders(restaurantId: string, timeZone: string, now = new Date()): Promise<BoardOrder[]> {
  const supabase = await createSupabaseServerClient();
  const since = startOfDayInTimeZone(now, timeZone).toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select(BOARD_ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .or(`status.in.(${OPEN_STATUSES.join(",")}),delivered_at.gte.${since},cancelled_at.gte.${since}`)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return data ?? [];
}

/** One board card (used when realtime announces a new order). Null when not visible to the member. */
export async function getBoardOrder(restaurantId: string, orderId: string): Promise<BoardOrder | null> {
  if (!isUuid(orderId)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(BOARD_ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data;
}

export interface OrderDetailAddon {
  id: string;
  group_name: string;
  option_name: string;
  quantity: number;
  unit_price_cents: number;
}

export interface OrderDetailItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  addons: OrderDetailAddon[];
}

export interface OrderDetailPayment {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  amount_cents: number;
  paid_at: string | null;
  created_at: string;
  /** Development payment confirmed through the simulate route (`raw.simulated`); shown as "Simulado". */
  simulated: boolean;
}

export interface OrderDetailHistory {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface OrderAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  reference?: string;
}

export type OrderDetail = Omit<Order, "address" | "public_token" | "buyer_user_id"> & {
  address: OrderAddress | null;
  items: OrderDetailItem[];
  payment: OrderDetailPayment | null;
  history: OrderDetailHistory[];
  customer_orders_count: number | null;
  coupon_code: string | null;
};

const DETAIL_SELECT =
  "id, restaurant_id, number, status, type, customer_id, customer_name, customer_phone, address, table_number, scheduled_for, notes, payment_method, change_for_cents, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, coupon_id, delivery_zone_id, cancel_reason, created_at, updated_at, confirmed_at, preparing_at, ready_at, out_for_delivery_at, delivered_at, cancelled_at, items:order_items(id, product_name, variant_name, quantity, unit_price_cents, total_cents, notes, created_at, addons:order_item_addons(id, group_name, option_name, quantity, unit_price_cents)), payments(id, method, status, provider, amount_cents, paid_at, created_at, simulated:raw->simulated), history:order_status_history(id, from_status, to_status, note, actor_id, created_at), customer:customers!orders_customer_id_fkey(orders_count), coupon:coupons!orders_coupon_id_fkey(code)" as const;

function asAddress(value: Json | null): OrderAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) if (typeof v === "string" && v.trim()) out[k] = v;
  return out as OrderAddress;
}

/**
 * Full order for the detail drawer and the receipt, scoped to the current restaurant. Returns null for
 * unknown orders and other tenants' orders alike (RLS + the explicit restaurant filter).
 */
export async function getOrderDetail(restaurantId: string, orderId: string): Promise<OrderDetail | null> {
  if (!isUuid(orderId)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(DETAIL_SELECT)
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  if (!data) return null;

  const { items, payments, history, customer, coupon, address, ...order } = data;

  const actorIds = [...new Set(history.map((h) => h.actor_id).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
    for (const p of profiles ?? []) if (p.full_name) names.set(p.id, p.full_name);
  }

  const byDate = <T extends { created_at: string }>(a: T, b: T) => (a.created_at < b.created_at ? -1 : 1);
  const latestPayment = [...payments].sort(byDate).at(-1);

  return {
    ...order,
    address: asAddress(address),
    items: [...items].sort(byDate).map((i) => ({ ...i, addons: i.addons ?? [] })),
    // One payment per order today; the latest one wins if a retry ever adds another.
    payment: latestPayment ? { ...latestPayment, simulated: latestPayment.simulated === true } : null,
    history: [...history].sort(byDate).map(({ actor_id, ...h }) => ({
      ...h,
      actor_name: actor_id ? (names.get(actor_id) ?? null) : null,
    })),
    customer_orders_count: customer?.orders_count ?? null,
    coupon_code: coupon?.code ?? null,
  };
}

export interface RestaurantPrintInfo {
  id: string;
  name: string;
  timezone: string;
  /** Average prep time (minutes): scheduled orders due later than now + this are only accepted. */
  avg_prep_minutes: number;
  phone: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
}

/** Restaurant fields used by the board (timezone) and the receipt header. */
export async function getRestaurantInfo(restaurantId: string): Promise<RestaurantPrintInfo> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, timezone, avg_prep_minutes, phone, address_street, address_number, address_neighborhood, address_city, address_state")
    .eq("id", restaurantId)
    .single();
  if (error) throw new Error(`Failed to load restaurant: ${error.message}`);
  return { ...data, timezone: data.timezone || "America/Sao_Paulo" };
}
