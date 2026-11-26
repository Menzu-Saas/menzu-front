"use server";

import { getMemberships, getSessionUser, writeCurrentRestaurantCookie } from "@/server/auth";

export type SetCurrentRestaurantResult = { ok: true } | { ok: false; error: string };

/** Switches the restaurant being operated (`mz_rid` cookie). Only accepts restaurants the user is a member of. */
export async function setCurrentRestaurant(rid: string): Promise<SetCurrentRestaurantResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Faça login para continuar." };
  const memberships = await getMemberships();
  if (!memberships.some((m) => m.restaurant_id === rid)) {
    return { ok: false, error: "Você não faz parte deste restaurante." };
  }
  await writeCurrentRestaurantCookie(rid);
  return { ok: true };
}
