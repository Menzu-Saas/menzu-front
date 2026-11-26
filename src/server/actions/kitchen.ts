"use server";

import { parseKitchenOrders, type KitchenOrder } from "@/lib/kitchen";
import { parseMenzuError } from "@/lib/order-errors";
import { KITCHEN_ROLES } from "@/lib/role-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { requireMemberOf } from "@/server/auth";
import type { ActionResult } from "./orders";

/**
 * Kitchen board data. KITCHEN members have no RLS access to orders, so the kitchen reads ONLY through
 * the `kitchen_orders` RPC (no phone, address, totals or token), whatever the member's role.
 */
export async function listKitchenOrdersAction(rid: string): Promise<ActionResult<KitchenOrder[]>> {
  // The page's restaurant, not the cookie: a tab left open after a switch elsewhere must not show
  // another restaurant's orders under this one's header.
  const m = await requireMemberOf(rid, KITCHEN_ROLES);
  if (!m.ok) return { ok: false, error: m.error, code: "STALE_RESTAURANT" };
  const restaurantId = m.restaurantId;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kitchen_orders", { p_restaurant_id: restaurantId });
  if (error) {
    const { code, message } = parseMenzuError(error);
    return { ok: false, error: message, code };
  }
  return { ok: true, data: parseKitchenOrders(data) };
}

const KITCHEN_TARGETS = ["PREPARING", "READY"] as const;
export type KitchenTarget = (typeof KITCHEN_TARGETS)[number];

/** "Iniciar preparo" (CONFIRMED → PREPARING) and "Pronto" (PREPARING → READY); the RPC re-checks role and transition. */
export async function advanceKitchenOrderAction(rid: string, orderId: string, to: KitchenTarget): Promise<ActionResult> {
  if (!isUuid(orderId) || !KITCHEN_TARGETS.includes(to)) {
    return { ok: false, error: "Dados inválidos.", code: "INVALID_INPUT" };
  }
  // Kitchen users read only the reduced, restaurant-scoped RPC result.
  const orders = await listKitchenOrdersAction(rid);
  if (!orders.ok) return orders;
  if (!orders.data.some((order) => order.id === orderId)) {
    return { ok: false, error: "Pedido não encontrado na cozinha.", code: "ORDER_NOT_FOUND" };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_order_status", { p_order_id: orderId, p_to: to });
  if (error) {
    const { code, message } = parseMenzuError(error);
    return { ok: false, error: message, code };
  }
  return { ok: true, data: undefined };
}
