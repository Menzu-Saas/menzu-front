import { redirect } from "next/navigation";
import { RESTAURANT_ACCESS_PATH } from "@/lib/role-home";
import { requireUser } from "@/server/auth";
import { restaurantAccessDestination } from "@/server/restaurant-access";

export async function GET() {
  await requireUser(RESTAURANT_ACCESS_PATH);
  redirect(await restaurantAccessDestination());
}
