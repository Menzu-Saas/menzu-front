"use client";

import { useEffect, useRef, useState } from "react";
import { getCartStore, type CartLine } from "@/stores/cart";

export const CART_UNDO_MS = 8000;
type Removal = { slug: string; line: CartLine; index: number; expiresAt: number };

export function useCartRemoval(slug: string) {
  const [removed, setRemoved] = useState<Removal | null>(null);
  const pending = useRef<Removal | null>(null);
  const store = getCartStore(slug);

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => {
      if (pending.current !== removed) return;
      pending.current = null;
      setRemoved(null);
    }, Math.max(0, removed.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [removed]);

  function remove(lineId: string) {
    const index = store.getState().items.findIndex((line) => line.lineId === lineId);
    if (index < 0) return;
    const snapshot = { slug, line: store.getState().items[index], index, expiresAt: Date.now() + CART_UNDO_MS };
    pending.current = snapshot;
    setRemoved(snapshot);
    store.getState().remove(lineId);
  }
  function undo() {
    const snapshot = pending.current;
    pending.current = null;
    setRemoved(null);
    if (!snapshot || snapshot.slug !== slug || snapshot.expiresAt <= Date.now()) return;
    store.getState().restore(snapshot.line, snapshot.index);
  }
  function quantity(lineId: string, value: number) {
    if (value <= 0) remove(lineId);
    else store.getState().updateQty(lineId, value);
  }
  return { removed: removed?.slug === slug ? removed : null, remove, undo, quantity };
}
export type CartRemoval = ReturnType<typeof useCartRemoval>;
