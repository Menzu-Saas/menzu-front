import { formatMoney } from "@/lib/money";
import type { OrderType } from "@/lib/order-status";
import type { PublicProduct } from "@/server/queries/public-menu";

/** "R$ 20" for whole reais, otherwise "R$ 20,50" (chips such as "Mín. R$ 20"). */
export function shortMoney(cents: number): string {
  return formatMoney(cents).replace(/,00$/, "");
}

/** Price shown on a menu row: lowest available variant for products with variants. */
export function displayPrice(p: PublicProduct): { cents: number; fromPrefix: boolean; strikeCents: number | null } {
  if (p.variants.length) {
    const prices = p.variants.filter((v) => v.available).map((v) => v.priceCents);
    const all = prices.length ? prices : p.variants.map((v) => v.priceCents);
    const min = Math.min(...all);
    return { cents: min, fromPrefix: new Set(all).size > 1, strikeCents: null };
  }
  if (p.promoPriceCents != null) return { cents: p.promoPriceCents, fromPrefix: false, strikeCents: p.priceCents };
  return { cents: p.priceCents, fromPrefix: false, strikeCents: null };
}

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DELIVERY: "Entrega",
  PICKUP: "Retirada",
  DINE_IN: "Mesa",
};

export function deliveryRange(range: { min: number; max: number } | null, fallback: number): string {
  if (!range) return `${fallback}–${fallback + 10} min`;
  return range.min === range.max ? `${range.min}–${range.min + 10} min` : `${range.min}–${range.max} min`;
}

export function itemsLabel(n: number): string {
  return n === 1 ? "1 item" : `${n} itens`;
}
