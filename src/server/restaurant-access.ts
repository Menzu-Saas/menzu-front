import { homeForRole } from "@/lib/role-home";
import { getCurrentMembership, getMemberships, writeCurrentRestaurantCookie } from "@/server/auth";

export async function restaurantAccessDestination(): Promise<string> {
  const current = await getCurrentMembership();
  if (current && current.role !== "DELIVERY") return homeForRole(current.role);

  const restaurant = (await getMemberships()).find(({ role }) => role !== "DELIVERY");
  if (!restaurant) return "/sem-restaurante";

  await writeCurrentRestaurantCookie(restaurant.restaurant_id);
  return homeForRole(restaurant.role);
}
