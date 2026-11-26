"use server";

import { parseMenzuError } from "@/lib/order-errors";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { ADMIN_ROLES } from "@/lib/role-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import type { BoardOrder } from "@/lib/order-board";
import { getCurrentMembership, requireMemberOf } from "@/server/auth";
import { BETA_UNAVAILABLE } from "@/lib/beta-unavailable";
import { cancelProviderCharges } from "@/server/payments/cancel";
import { getBoardOrder, getOrderDetail, listBoardOrders, getRestaurantInfo, type OrderDetail } from "@/server/orders/queries";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/** Board member (OWNER/MANAGER/ATTENDANT) of the current restaurant, or an error result. */
async function boardMember() {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Faça login para continuar." } as const;
  if (!(ADMIN_ROLES as readonly string[]).includes(membership.role)) {
    return { error: "Você não tem permissão para esta ação." } as const;
  }
  return { membership } as const;
}

function fail(e: unknown): { ok: false; error: string; code: string } {
  const { code, message } = parseMenzuError(e);
  return { ok: false, error: message, code };
}

/** Applies one or more status changes in order (e.g. CONFIRMED then PREPARING), stopping at the first error. */
export async function updateOrderStatusAction(
  rid: string,
  orderId: string,
  steps: OrderStatus[],
  reason?: string,
): Promise<ActionResult> {
  const member = await requireMemberOf(rid, ADMIN_ROLES);
  if (!member.ok) return member;
  if (!isUuid(orderId) || !Array.isArray(steps) || steps.length === 0 || steps.length > 2 || !steps.every((s) => ORDER_STATUSES.includes(s)) || (reason !== undefined && typeof reason !== "string")) {
    return { ok: false, error: "Dados inválidos.", code: "INVALID_INPUT" };
  }
  const supabase = await createSupabaseServerClient();
  const { data: order, error: lookupError } = await supabase.from("orders").select("id")
    .eq("restaurant_id", member.restaurantId).eq("id", orderId).maybeSingle();
  if (lookupError || !order) return { ok: false, error: "Pedido não encontrado.", code: "ORDER_NOT_FOUND" };
  for (const to of steps) {
    const { error } = await supabase.rpc("update_order_status", {
      p_order_id: orderId,
      p_to: to,
      p_reason: to === "CANCELLED" ? (reason?.trim().slice(0, 500) ?? undefined) : undefined,
    });
    if (error) return fail(error);
  }
  if (steps.includes("CANCELLED")) await cancelProviderCharges(supabase, orderId);
  return { ok: true, data: undefined };
}

export async function markPaymentPaidAction(rid: string, paymentId: string): Promise<ActionResult> {
  const member = await requireMemberOf(rid, ADMIN_ROLES);
  if (!member.ok) return member;
  if (!isUuid(paymentId)) return { ok: false, error: "Dados inválidos.", code: "INVALID_INPUT" };
  const supabase = await createSupabaseServerClient();
  const { data: payment, error: lookupError } = await supabase.from("payments").select("id")
    .eq("restaurant_id", member.restaurantId).eq("id", paymentId).maybeSingle();
  if (lookupError || !payment) return { ok: false, error: "Pagamento não encontrado.", code: "PAYMENT_NOT_FOUND" };
  const { error } = await supabase.rpc("mark_payment_paid", { p_payment_id: paymentId });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/**
 * Development payments only (provider "development"): settles the payment as PAID through the
 * dev_simulate_payment RPC, which re-checks OWNER/MANAGER, the provider and the allow_development_payments
 * flag. Refused in production and whenever Mercado Pago is configured.
 */
export async function simulatePaymentAction(_paymentId: string): Promise<ActionResult> {
  return { ok: false, error: BETA_UNAVAILABLE, code: "BETA_UNAVAILABLE" };
}

/** Full detail for the drawer; `data` is null when the order is not visible (other tenant / unknown). */
export async function getOrderDetailAction(orderId: string): Promise<ActionResult<OrderDetail | null>> {
  const m = await boardMember();
  if ("error" in m) return { ok: false, error: m.error ?? "Erro" };
  // A malformed id is simply "not found" (never a 500 from a uuid cast).
  if (!isUuid(orderId)) return { ok: true, data: null };
  try {
    return { ok: true, data: await getOrderDetail(m.membership.restaurant_id, orderId) };
  } catch {
    return { ok: false, error: "Não foi possível carregar o pedido." };
  }
}

/** One board card (realtime INSERT), read for the page's restaurant (`rid`), never the cookie's. */
export async function getBoardOrderAction(rid: string, orderId: string): Promise<ActionResult<BoardOrder | null>> {
  const m = await requireMemberOf(rid, ADMIN_ROLES);
  if (!m.ok) return { ok: false, error: m.error, code: "STALE_RESTAURANT" };
  if (!isUuid(orderId)) return { ok: true, data: null };
  try {
    return { ok: true, data: await getBoardOrder(m.restaurantId, orderId) };
  } catch {
    return { ok: false, error: "Não foi possível carregar o pedido." };
  }
}

/** Whole board (after a realtime reconnect), for the page's restaurant (`rid`), never the cookie's. */
export async function listBoardOrdersAction(rid: string): Promise<ActionResult<BoardOrder[]>> {
  const m = await requireMemberOf(rid, ADMIN_ROLES);
  if (!m.ok) return { ok: false, error: m.error, code: "STALE_RESTAURANT" };
  try {
    const info = await getRestaurantInfo(m.restaurantId);
    return { ok: true, data: await listBoardOrders(m.restaurantId, info.timezone) };
  } catch {
    return { ok: false, error: "Não foi possível atualizar os pedidos." };
  }
}
