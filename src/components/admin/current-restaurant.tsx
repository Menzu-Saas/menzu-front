"use client";

import { createContext, useContext, type ReactNode } from "react";

const CurrentRestaurantContext = createContext<string | null>(null);

/** Restaurant the admin pages were rendered for; management actions send it so the server can refuse a stale tab. */
export function CurrentRestaurantProvider({ restaurantId, children }: { restaurantId: string; children: ReactNode }) {
  return <CurrentRestaurantContext.Provider value={restaurantId}>{children}</CurrentRestaurantContext.Provider>;
}

/** The id of the restaurant rendered on this page (inside /painel). */
export function useRestaurantId(): string {
  const id = useContext(CurrentRestaurantContext);
  if (!id) throw new Error("useRestaurantId must be used inside CurrentRestaurantProvider");
  return id;
}
