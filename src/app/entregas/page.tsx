import type { Metadata } from "next";
import { DeliveryBoard } from "@/components/delivery/delivery-board";
import { DeliverySettings } from "@/components/courier/delivery-settings";
import { ADMIN_ROLES } from "@/lib/role-home";
import { requireMember } from "@/server/auth";
import { getOpsRestaurantInfo, listDeliveryOrders } from "@/server/orders/delivery";

export const metadata: Metadata = { title: "Entregas" };
export const dynamic = "force-dynamic";

/** Courier screen: delivery orders through RLS (DELIVERY sees READY / OUT_FOR_DELIVERY / DELIVERED only). */
export default async function EntregasPage() {
  const { restaurantId, role, restaurant } = await requireMember(ADMIN_ROLES);
  const now = new Date();
  const info = await getOpsRestaurantInfo(restaurantId);
  const orders = await listDeliveryOrders(restaurantId, info.timezone, now);
  return (
    <DeliveryBoard
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      timeZone={info.timezone}
      initialOrders={orders}
      serverNow={now.getTime()}
      showPanelLink={(ADMIN_ROLES as readonly string[]).includes(role)}
      settings={<DeliverySettings />}
    />
  );
}
