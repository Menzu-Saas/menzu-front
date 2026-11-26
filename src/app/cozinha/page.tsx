import type { Metadata } from "next";
import { KitchenBoard } from "@/components/kitchen/kitchen-board";
import { parseKitchenOrders, type KitchenOrder } from "@/lib/kitchen";
import { isPreviewRestaurant, previewOrders } from "@/lib/restaurant-preview";
import { ADMIN_ROLES, KITCHEN_ROLES } from "@/lib/role-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { getOpsRestaurantInfo } from "@/server/orders/delivery";

export const metadata: Metadata = { title: "Cozinha" };
export const dynamic = "force-dynamic";

/** Kitchen screen. Reads orders ONLY through the kitchen_orders RPC (no contact data, no money). */
export default async function CozinhaPage() {
  const { restaurantId, role, restaurant } = await requireMember(KITCHEN_ROLES);
  const now = new Date();
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, info] = await Promise.all([
    supabase.rpc("kitchen_orders", { p_restaurant_id: restaurantId }),
    getOpsRestaurantInfo(restaurantId),
  ]);
  const examples: KitchenOrder[] = isPreviewRestaurant(restaurant)
    ? previewOrders(now).slice(0, 6).map(({ order, dish, quantity }, index) => {
      const status = (["CONFIRMED", "PREPARING", "READY"] as const)[index % 3];
      return {
        id: order.id, number: order.number, type: order.type, status,
        table_number: order.type === "DINE_IN" ? 2 : null,
        created_at: order.created_at, confirmed_at: order.created_at,
        preparing_at: status === "CONFIRMED" ? null : order.created_at,
        ready_at: status === "READY" ? now.toISOString() : null,
        scheduled_for: null, notes: index === 1 ? "Enviar parmesão à parte." : null,
        customer_first_name: order.customer_name.split(" ")[0] + " · Demo",
        items: [{ product_name: dish.name, variant_name: null, quantity, notes: null, addons: [] }],
      };
    }) : [];
  return (
    <KitchenBoard
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      timeZone={info.timezone}
      avgPrepMinutes={info.avgPrepMinutes}
      initialOrders={[...(error ? [] : parseKitchenOrders(data)), ...examples]}
      initialLoadFailed={Boolean(error)}
      serverNow={now.getTime()}
      showPanelLink={(ADMIN_ROLES as readonly string[]).includes(role)}
    />
  );
}
