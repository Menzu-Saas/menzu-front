"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { countPendingOrdersAction } from "@/server/actions/pending-orders";

const DEBOUNCE_MS = 800;

/**
 * Live "Pedidos" badge: starts from the server count and recounts (debounced) on every order
 * insert/update in realtime, so accepting orders or new arrivals update it on any panel page.
 */
export function usePendingOrders(restaurantId: string, initial: number): number {
  const [count, setCount] = useState(initial);
  const [seen, setSeen] = useState(initial);
  // A server re-render (router.refresh / navigation) brings a fresh count.
  if (initial !== seen) {
    setSeen(initial);
    setCount(initial);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recount = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      countPendingOrdersAction(restaurantId).then(
        (n) => n !== null && setCount(n),
        () => {}, // best-effort badge
      );
    }, DEBOUNCE_MS);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useRealtimeOrders(restaurantId, { onInsert: recount, onUpdate: recount, onResync: recount });
  return count;
}
