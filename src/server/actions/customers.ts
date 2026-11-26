"use server";

import type { OrderStatus, OrderType } from "@/lib/order-status";
import { ADMIN_ROLES } from "@/lib/role-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";

export interface CustomerOrderSummary {
  id: string;
  number: number;
  created_at: string;
  total_cents: number;
  status: OrderStatus;
  type: OrderType;
}

export interface CustomerAddressSummary {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
}

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  orders_count: number;
  total_spent_cents: number;
  avg_ticket_cents: number;
  last_order_at: string | null;
  created_at: string;
  coupons_used: number;
  addresses: CustomerAddressSummary[];
  orders: CustomerOrderSummary[];
}

export type CustomerDetailResult = { ok: true; customer: CustomerDetail } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = "Cliente não encontrado.";
const HISTORY_LIMIT = 50;

/** Customer drawer data: stats, addresses and the latest orders (OWNER/MANAGER/ATTENDANT, current restaurant only). */
export async function getCustomerDetailAction(id: string): Promise<CustomerDetailResult> {
  const { restaurantId } = await requireMember(ADMIN_ROLES);
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: NOT_FOUND };
  const supabase = await createSupabaseServerClient();

  const [customer, orders, addresses, coupons] = await Promise.all([
    supabase
      .from("customer_stats")
      .select("id, name, phone, email, orders_count, total_spent_cents, avg_ticket_cents, last_order_at, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, number, created_at, total_cents, status, type")
      .eq("restaurant_id", restaurantId)
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("customer_addresses")
      .select("id, label, street, number, complement, neighborhood, city")
      .eq("restaurant_id", restaurantId)
      .eq("customer_id", id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("customer_id", id),
  ]);

  if (customer.error || orders.error || addresses.error) return { ok: false, error: "Não foi possível carregar o cliente." };
  const c = customer.data;
  if (!c?.id || !c.name || !c.phone || !c.created_at) return { ok: false, error: NOT_FOUND };

  return {
    ok: true,
    customer: {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email ?? null,
      orders_count: c.orders_count ?? 0,
      total_spent_cents: c.total_spent_cents ?? 0,
      avg_ticket_cents: c.avg_ticket_cents ?? 0,
      last_order_at: c.last_order_at ?? null,
      created_at: c.created_at,
      coupons_used: coupons.count ?? 0,
      addresses: addresses.data ?? [],
      orders: (orders.data ?? []) as CustomerOrderSummary[],
    },
  };
}
