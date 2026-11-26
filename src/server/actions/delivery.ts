"use server";

import type { DeliveryOrder } from "@/lib/delivery";
import { parseMenzuError } from "@/lib/order-errors";
import { ADMIN_ROLES } from "@/lib/role-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { requireMemberOf } from "@/server/auth";
import { getOpsRestaurantInfo, listDeliveryOrders } from "@/server/orders/delivery";
import type { ActionResult } from "./orders";

function fail(e: unknown): { ok: false; error: string; code: string } {
  const { code, message } = parseMenzuError(e);
  return { ok: false, error: message, code };
}

/** Courier list (after a realtime event / reconnect / focus). */
export async function listDeliveryOrdersAction(rid: string): Promise<ActionResult<DeliveryOrder[]>> {
  // The page's restaurant, not the cookie (stale tab after a switch elsewhere).
  const m = await requireMemberOf(rid, ADMIN_ROLES);
  if (!m.ok) return { ok: false, error: m.error, code: "STALE_RESTAURANT" };
  const restaurantId = m.restaurantId;
  try {
    const { timezone } = await getOpsRestaurantInfo(restaurantId);
    return { ok: true, data: await listDeliveryOrders(restaurantId, timezone) };
  } catch {
    return { ok: false, error: "Não foi possível atualizar as entregas." };
  }
}

const DELIVERY_TARGETS = ["OUT_FOR_DELIVERY", "DELIVERED"] as const;
export type DeliveryTarget = (typeof DELIVERY_TARGETS)[number];

/** "Saiu para entrega" (READY → OUT_FOR_DELIVERY) and "Entregue" (OUT_FOR_DELIVERY → DELIVERED). */
export async function advanceDeliveryOrderAction(rid: string, orderId: string, to: DeliveryTarget): Promise<ActionResult> {
  const member = await requireMemberOf(rid, ADMIN_ROLES);
  if (!member.ok) return member;
  if (!isUuid(orderId) || !DELIVERY_TARGETS.includes(to)) {
    return { ok: false, error: "Dados inválidos.", code: "INVALID_INPUT" };
  }
  const supabase = await createSupabaseServerClient();
  const { data: order, error: lookupError } = await supabase.from("orders").select("id")
    .eq("restaurant_id", member.restaurantId).eq("id", orderId).eq("type", "DELIVERY").maybeSingle();
  if (lookupError || !order) return { ok: false, error: "Entrega não encontrada.", code: "ORDER_NOT_FOUND" };
  const { error } = await supabase.rpc("update_order_status", { p_order_id: orderId, p_to: to });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** "Receber pagamento": offline payment collected at the door (mark_payment_paid re-checks role/status). */
export async function receiveDeliveryPaymentAction(rid: string, paymentId: string): Promise<ActionResult> {
  const member = await requireMemberOf(rid, ADMIN_ROLES);
  if (!member.ok) return member;
  if (!isUuid(paymentId)) return { ok: false, error: "Dados inválidos.", code: "INVALID_INPUT" };
  const supabase = await createSupabaseServerClient();
  const { data: payment, error: lookupError } = await supabase.from("payments").select("id, orders!inner(id)")
    .eq("restaurant_id", member.restaurantId).eq("id", paymentId)
    .eq("orders.type", "DELIVERY").in("orders.status", ["OUT_FOR_DELIVERY", "DELIVERED"]).maybeSingle();
  if (lookupError || !payment) return { ok: false, error: "Pagamento da entrega não encontrado.", code: "PAYMENT_NOT_FOUND" };
  const { error } = await supabase.rpc("mark_payment_paid", { p_payment_id: paymentId });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}
