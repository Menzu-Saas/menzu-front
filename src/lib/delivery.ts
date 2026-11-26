// Pure helpers for the delivery screen (/entregas): card shape, address formatting, map link and
// the amount the courier collects at the door.
import type { OrderStatus } from "./order-status";
import type { Json, PaymentMethod, PaymentStatus } from "./types";

export const DELIVERY_ORDER_SELECT =
  "id, number, status, customer_name, customer_phone, address, notes, payment_method, change_for_cents, total_cents, created_at, ready_at, out_for_delivery_at, delivered_at, payments(id, provider, method, status, amount_cents, created_at)" as const;

export interface DeliveryAddress {
  latitude?: number;
  longitude?: number;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  reference?: string;
}

export interface DeliveryPayment {
  id: string;
  provider: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount_cents: number;
}

export interface DeliveryOrder {
  id: string;
  number: number;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  address: DeliveryAddress | null;
  notes: string | null;
  payment_method: PaymentMethod;
  change_for_cents: number | null;
  total_cents: number;
  created_at: string;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  payment: DeliveryPayment | null;
}

export function asDeliveryAddress(value: Json | null | undefined): DeliveryAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(value)) if (typeof v === "string" && v.trim()) out[k] = v.trim();
  if (typeof value.latitude==="number" && Number.isFinite(value.latitude) && Math.abs(value.latitude)<=90 && typeof value.longitude==="number" && Number.isFinite(value.longitude) && Math.abs(value.longitude)<=180) {out.latitude=value.latitude;out.longitude=value.longitude;}
  return out as DeliveryAddress;
}

/** "Rua Augusta, 900 · Apto 81". */
export function streetLine(a: DeliveryAddress | null): string {
  if (!a) return "";
  const line = [a.street, a.number].filter(Boolean).join(", ");
  return [line, a.complement].filter(Boolean).join(" · ");
}

/** "São Paulo/SP · CEP 01305-100". */
export function cityLine(a: DeliveryAddress | null): string {
  if (!a) return "";
  const city = [a.city, a.state].filter(Boolean).join("/");
  return [city, a.cep ? `CEP ${a.cep}` : ""].filter(Boolean).join(" · ");
}

/** Google Maps search link for the address (street, number, neighborhood, city, state, CEP). */
export function mapsUrl(a: DeliveryAddress | null): string | null {
  if (!a) return null;
  if (a.latitude!=null && a.longitude!=null) return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(a.latitude+","+a.longitude);
  const query = [[a.street, a.number].filter(Boolean).join(", "), a.neighborhood, a.city, a.state, a.cep]
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface Collection {
  /** Amount the courier collects (the order payment amount). */
  amountCents: number;
  /** Paid in cash with "troco para": change to bring. */
  changeCents: number | null;
  changeForCents: number | null;
  method: PaymentMethod;
}

/**
 * What to collect at the door: only for offline payments (cash / card on delivery) still pending.
 * Online payments (Pix / card online) are never collected by the courier.
 */
export function collectionFor(o: Pick<DeliveryOrder, "payment" | "payment_method" | "change_for_cents" | "total_cents">): Collection | null {
  const p = o.payment;
  if (!p || p.provider !== "offline" || p.status !== "PENDING") return null;
  const amount = p.amount_cents || o.total_cents;
  const changeFor = p.method === "CASH" && o.change_for_cents != null && o.change_for_cents > amount ? o.change_for_cents : null;
  return {
    amountCents: amount,
    changeForCents: changeFor,
    changeCents: changeFor != null ? changeFor - amount : null,
    method: p.method,
  };
}

/** Payment line for an order the courier does not have to charge. */
export function paymentNote(o: Pick<DeliveryOrder, "payment">): string {
  const p = o.payment;
  if (!p) return "Pagamento não registrado";
  if (p.status === "PAID") return p.provider === "offline" ? "Pagamento recebido" : "Pago online";
  if (p.provider === "offline") return "Cobrar na entrega";
  return "Pagamento online pendente";
}

export interface DeliverySections {
  ready: DeliveryOrder[];
  onRoute: DeliveryOrder[];
  /**
   * Delivered today, newest first: every order whose door payment is still to be registered, plus
   * the most recent settled ones (at most `deliveredLimit`).
   */
  delivered: DeliveryOrder[];
  /** All orders delivered today (the section count). */
  deliveredCount: number;
}

const ts = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

export function splitDeliverySections(orders: DeliveryOrder[], deliveredLimit = 10): DeliverySections {
  const delivered = orders.filter((o) => o.status === "DELIVERED").sort((a, b) => ts(b.delivered_at) - ts(a.delivered_at));
  const settled = delivered.filter((o) => collectionFor(o) === null);
  return {
    ready: orders.filter((o) => o.status === "READY").sort((a, b) => ts(a.ready_at) - ts(b.ready_at) || a.number - b.number),
    onRoute: orders
      .filter((o) => o.status === "OUT_FOR_DELIVERY")
      .sort((a, b) => ts(a.out_for_delivery_at) - ts(b.out_for_delivery_at) || a.number - b.number),
    delivered: delivered.filter((o) => collectionFor(o) !== null || settled.indexOf(o) < deliveredLimit),
    deliveredCount: delivered.length,
  };
}
