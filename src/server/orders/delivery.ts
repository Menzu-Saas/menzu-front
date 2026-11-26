import "server-only";

import { startOfDayInTimeZone } from "@/lib/order-board";
import { asDeliveryAddress, DELIVERY_ORDER_SELECT, type DeliveryOrder, type DeliveryPayment } from "@/lib/delivery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Delivery orders for the courier screen: READY and OUT_FOR_DELIVERY delivery orders plus the ones
 * delivered today (restaurant timezone). RLS limits DELIVERY members to exactly these statuses; the
 * explicit filters keep OWNER/MANAGER/ATTENDANT (who can read every order) on the same list.
 */
export async function listDeliveryOrders(restaurantId: string, timeZone: string, now = new Date()): Promise<DeliveryOrder[]> {
  const supabase = await createSupabaseServerClient();
  const since = startOfDayInTimeZone(now, timeZone).toISOString();
  const fetchPage = (from: number) => supabase
    .from("orders")
    .select(DELIVERY_ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .eq("type", "DELIVERY")
    .or(`status.in.(READY,OUT_FOR_DELIVERY),and(status.eq.DELIVERED,delivered_at.gte.${since})`)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + 199);
  const { data, error } = await fetchPage(0);
  if (error) throw new Error(`Failed to load delivery orders: ${error.message}`);
  const rows = data ?? [];
  let batchSize = rows.length;
  for (let offset = 200; batchSize === 200; offset += 200) {
    const next = await fetchPage(offset);
    if (next.error) throw new Error(`Failed to load delivery orders: ${next.error.message}`);
    batchSize = next.data?.length ?? 0;
    rows.push(...(next.data ?? []));
  }
  return [...new Map(rows.map((row) => [row.id, row])).values()].map(({ payments, address, ...o }) => {
    const latest = [...(payments ?? [])].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).at(-1);
    const payment: DeliveryPayment | null = latest
      ? { id: latest.id, provider: latest.provider, method: latest.method, status: latest.status, amount_cents: latest.amount_cents }
      : null;
    return { ...o, address: asDeliveryAddress(address), payment };
  });
}

/** Restaurant fields the ops screens need (timezone for "today", avg prep time for kitchen timers). */
export async function getOpsRestaurantInfo(restaurantId: string): Promise<{ timezone: string; avgPrepMinutes: number }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("restaurants")
    .select("timezone, avg_prep_minutes")
    .eq("id", restaurantId)
    .maybeSingle();
  return { timezone: data?.timezone || "America/Sao_Paulo", avgPrepMinutes: data?.avg_prep_minutes ?? 30 };
}
