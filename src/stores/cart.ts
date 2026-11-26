"use client";

import { useEffect } from "react";
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore, type StoreApi } from "zustand/vanilla";
import { z } from "zod";
import type { OrderType } from "@/lib/order-status";

export type CartAddon = {
  optionId: string;
  groupName: string;
  name: string;
  quantity: number;
  /** Display estimate only; the server prices every order. */
  priceCents: number;
};

export type CartLine = {
  lineId: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  notes: string;
  addons: CartAddon[];
  /** Display estimate only (base + addons); never sent to the API. */
  unitPriceCents: number;
};

export type NewCartLine = Omit<CartLine, "lineId">;

export type CartState = {
  items: CartLine[];
  couponCode: string | null;
  type: OrderType;
  tableNumber: number | null;
  /** True once localStorage has been read (client only). */
  hydrated: boolean;
  add: (line: NewCartLine) => void;
  updateQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  restore: (line: CartLine, index: number) => void;
  update: (lineId: string, patch: Partial<NewCartLine>) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  setType: (type: OrderType) => void;
  setTable: (table: number | null) => void;
};

export type CartStore = StoreApi<CartState> & {
  persist: { rehydrate: () => Promise<void> | void; hasHydrated: () => boolean };
};

const MAX_QTY = 99;

// Persisted data is untrusted (old versions, other tabs, manual edits): validate line by line.
const idText = z.string().min(1).max(100);
const addonSchema = z.object({
  optionId: idText,
  groupName: z.string().max(200).catch(""),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(MAX_QTY),
  priceCents: z.number().int().min(0).catch(0),
});
const lineSchema = z.object({
  lineId: idText,
  productId: idText,
  variantId: idText.nullable().catch(null),
  name: z.string().min(1).max(200),
  variantName: z.string().max(200).nullable().catch(null),
  imageUrl: z.string().max(2000).nullable().catch(null),
  quantity: z.number().int().min(1).max(MAX_QTY),
  notes: z.string().max(140).catch(""),
  addons: z.array(addonSchema).max(50),
  unitPriceCents: z.number().int().min(0).catch(0),
});

type PersistedCart = Pick<CartState, "items" | "couponCode" | "type" | "tableNumber">;

/** Keeps only valid lines and coerces the other fields to safe values. */
export function sanitizePersistedCart(raw: unknown): PersistedCart {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const items = Array.isArray(obj.items)
    ? obj.items.flatMap((i) => {
        const r = lineSchema.safeParse(i);
        return r.success ? [r.data as CartLine] : [];
      })
    : [];
  const type = z.enum(["DELIVERY", "PICKUP", "DINE_IN"]).catch("DELIVERY").parse(obj.type);
  const tableNumber = z.number().int().min(1).max(9999).nullable().catch(null).parse(obj.tableNumber ?? null);
  const coupon = typeof obj.couponCode === "string" ? obj.couponCode.trim().toUpperCase().slice(0, 20) : "";
  return { items, type, tableNumber, couponCode: coupon || null };
}

export const cartStorageKey = (slug: string) => `menzu-cart:${slug}`;

/** Identity of a line: same product + variant + addons (any order) + trimmed notes ⇒ same line. */
export function lineKey(line: Pick<CartLine, "productId" | "variantId" | "addons" | "notes">): string {
  const addons = line.addons
    .map((a) => `${a.optionId}x${a.quantity}`)
    .sort()
    .join(",");
  return [line.productId, line.variantId ?? "", addons, line.notes.trim()].join("|");
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const clampQty = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(n)));

function createCartStore(slug: string): CartStore {
  return createStore<CartState>()(
    persist(
      (set) => ({
        items: [],
        couponCode: null,
        type: "DELIVERY",
        tableNumber: null,
        hydrated: false,
        add: (line) =>
          set((s) => {
            const qty = clampQty(line.quantity);
            if (qty < 1) return s;
            const normalized = { ...line, notes: line.notes.trim() };
            const key = lineKey(normalized);
            const existing = s.items.find((i) => lineKey(i) === key);
            if (existing) {
              return {
                items: s.items.map((i) =>
                  i.lineId === existing.lineId ? { ...i, ...normalized, quantity: clampQty(i.quantity + qty) } : i,
                ),
              };
            }
            return { items: [...s.items, { ...normalized, quantity: qty, lineId: newId() }] };
          }),
        updateQty: (lineId, qty) =>
          set((s) => {
            const q = clampQty(qty);
            if (q < 1) return { items: s.items.filter((i) => i.lineId !== lineId) };
            return { items: s.items.map((i) => (i.lineId === lineId ? { ...i, quantity: q } : i)) };
          }),
        remove: (lineId) => set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),
        restore: (line, index) => set((s) => {
          if (s.items.some((item) => item.lineId === line.lineId)) return s;
          const twin = s.items.find((item) => lineKey(item) === lineKey(line));
          if (twin) return { items: s.items.map((item) => item.lineId === twin.lineId ? { ...item, quantity: clampQty(item.quantity + line.quantity) } : item) };
          const items = [...s.items];
          items.splice(Math.max(0, Math.min(index, items.length)), 0, line);
          return { items };
        }),
        update: (lineId, patch) =>
          set((s) => {
            const current = s.items.find((i) => i.lineId === lineId);
            if (!current) return s;
            const next: CartLine = {
              ...current,
              ...patch,
              lineId,
              notes: (patch.notes ?? current.notes).trim(),
              quantity: clampQty(patch.quantity ?? current.quantity),
            };
            if (next.quantity < 1) return { items: s.items.filter((i) => i.lineId !== lineId) };
            const twin = s.items.find((i) => i.lineId !== lineId && lineKey(i) === lineKey(next));
            if (twin) {
              return {
                items: s.items
                  .filter((i) => i.lineId !== lineId)
                  .map((i) => (i.lineId === twin.lineId ? { ...next, lineId: i.lineId, quantity: clampQty(i.quantity + next.quantity) } : i)),
              };
            }
            return { items: s.items.map((i) => (i.lineId === lineId ? next : i)) };
          }),
        clear: () => set({ items: [], couponCode: null }),
        setCoupon: (code) => {
          const c = code?.trim().toUpperCase() ?? "";
          set({ couponCode: c ? c.slice(0, 20) : null });
        },
        setType: (type) => set({ type }),
        setTable: (table) => set({ tableNumber: table }),
      }),
      {
        name: cartStorageKey(slug),
        version: 1,
        storage: createJSONStorage(() => localStorage),
        migrate: (persisted) => sanitizePersistedCart(persisted) as unknown as CartState,
        merge: (persisted, current) => ({ ...current, ...sanitizePersistedCart(persisted) }),
        // Read localStorage only after mount (useCart) so server and first client render match.
        skipHydration: true,
        partialize: (s) => ({ items: s.items, couponCode: s.couponCode, type: s.type, tableNumber: s.tableNumber }),
        onRehydrateStorage: () => () => {
          stores.get(slug)?.setState({ hydrated: true });
        },
      },
    ),
  ) as CartStore;
}

const stores = new Map<string, CartStore>();

export function otherCartStores(slug: string): CartStore[] {
  const slugs = new Set(stores.keys());
  const prefix = cartStorageKey("");
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) slugs.add(key.slice(prefix.length));
    }
  } catch { /* In-memory carts still work when browser storage is unavailable. */ }

  const conflicts: CartStore[] = [];
  for (const other of slugs) {
    if (other === slug || !/^[a-z0-9-]+$/i.test(other)) continue;
    const store = getCartStore(other);
    if (!store.getState().hydrated) void store.persist.rehydrate();
    if (store.getState().items.length) conflicts.push(store);
  }
  return conflicts;
}

export function getCartStore(slug: string): CartStore {
  let store = stores.get(slug);
  if (!store) {
    store = createCartStore(slug);
    stores.set(slug, store);
    syncAcrossTabs(slug, store);
  }
  return store;
}

/**
 * Another tab wrote this cart (`storage` fires only in the other tabs): reload it, so two open tabs
 * do not silently overwrite each other's items (last write would win).
 */
function syncAcrossTabs(slug: string, store: CartStore) {
  if (typeof window === "undefined") return;
  const onStorage = (e: StorageEvent) => {
    if (e.key !== cartStorageKey(slug)) return;
    if (e.newValue == null) store.setState({ items: [], couponCode: null });
    else void store.persist.rehydrate();
  };
  window.addEventListener("storage", onStorage);
  tabListeners.push(() => window.removeEventListener("storage", onStorage));
}
const tabListeners: (() => void)[] = [];

/** Test helper: forget every in-memory store (localStorage is kept). */
export function resetCartStoresForTests() {
  stores.clear();
  tabListeners.splice(0).forEach((off) => off());
}

/** Cart of one restaurant, persisted in localStorage under `menzu-cart:{slug}`. */
export function useCart<T = CartState>(slug: string, selector?: (s: CartState) => T): T {
  const store = getCartStore(slug);
  useEffect(() => {
    if (!store.getState().hydrated) void store.persist.rehydrate();
  }, [store]);
  return useStore(store, selector ?? ((s) => s as unknown as T));
}

/** Estimated cart totals for display (the server quote is authoritative). */
export function cartCount(items: CartLine[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

export function cartEstimate(items: CartLine[]): number {
  return items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0);
}
