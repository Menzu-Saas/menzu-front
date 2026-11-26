"use server";

import { ADMIN_ROLES } from "@/lib/role-home";
import { requireMemberOf } from "@/server/auth";
import { countPendingOrders } from "@/server/queries/dashboard";

/** Orders waiting for acceptance (sidebar "Pedidos" badge); null when the page is stale or not allowed. */
export async function countPendingOrdersAction(rid: string): Promise<number | null> {
  const member = await requireMemberOf(rid, ADMIN_ROLES);
  if (!member.ok) return null;
  return countPendingOrders(member.restaurantId);
}
