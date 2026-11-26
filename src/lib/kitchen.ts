// Pure helpers for the kitchen screen (/cozinha). The data comes ONLY from the `kitchen_orders` RPC,
// which returns no phone, address, totals or token: the kitchen never sees customer contact or money.
import { ORDER_STATUSES, ORDER_TYPES, type OrderStatus, type OrderType } from "./order-status";

export interface KitchenAddon {
  group_name: string;
  option_name: string;
  quantity: number;
}

export interface KitchenItem {
  product_name: string;
  variant_name: string | null;
  quantity: number;
  notes: string | null;
  addons: KitchenAddon[];
}

export interface KitchenOrder {
  id: string;
  number: number;
  type: OrderType;
  table_number: number | null;
  status: OrderStatus;
  created_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  scheduled_for: string | null;
  notes: string | null;
  customer_first_name: string;
  items: KitchenItem[];
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/**
 * Defensive parse of the RPC payload (jsonb). Only the documented fields are kept, so even if the
 * function ever returned more, nothing else reaches the kitchen UI.
 */
export function parseKitchenOrders(payload: unknown): KitchenOrder[] {
  if (!Array.isArray(payload)) return [];
  const out: KitchenOrder[] = [];
  for (const raw of payload) {
    if (!isRec(raw)) continue;
    const id = str(raw.id);
    const status = raw.status as OrderStatus;
    const type = raw.type as OrderType;
    const createdAt = str(raw.created_at);
    if (!id || !createdAt || !ORDER_STATUSES.includes(status) || !ORDER_TYPES.includes(type)) continue;
    const items = Array.isArray(raw.items) ? raw.items : [];
    out.push({
      id,
      number: num(raw.number),
      type,
      table_number: typeof raw.table_number === "number" ? raw.table_number : null,
      status,
      created_at: createdAt,
      confirmed_at: str(raw.confirmed_at),
      preparing_at: str(raw.preparing_at),
      ready_at: str(raw.ready_at),
      scheduled_for: str(raw.scheduled_for),
      notes: str(raw.notes),
      customer_first_name: str(raw.customer_first_name) ?? "",
      items: items.filter(isRec).map((i) => ({
        product_name: str(i.product_name) ?? "",
        variant_name: str(i.variant_name),
        quantity: num(i.quantity, 1),
        notes: str(i.notes),
        addons: (Array.isArray(i.addons) ? i.addons : []).filter(isRec).map((a) => ({
          group_name: str(a.group_name) ?? "",
          option_name: str(a.option_name) ?? "",
          quantity: num(a.quantity, 1),
        })),
      })),
    });
  }
  return out;
}

export interface KitchenColumns {
  toPrepare: KitchenOrder[];
  preparing: KitchenOrder[];
  /** Most recent first, at most `readyLimit`. */
  ready: KitchenOrder[];
}

const ts = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

/** Queue order for the cook: scheduled time when there is one, otherwise arrival; ties by number. */
function queueKey(o: KitchenOrder): number {
  return ts(o.scheduled_for) || ts(o.confirmed_at) || ts(o.created_at);
}

export function splitKitchenColumns(orders: KitchenOrder[], readyLimit = 10): KitchenColumns {
  const byQueue = (a: KitchenOrder, b: KitchenOrder) => queueKey(a) - queueKey(b) || a.number - b.number;
  return {
    toPrepare: orders.filter((o) => o.status === "CONFIRMED").sort(byQueue),
    preparing: orders.filter((o) => o.status === "PREPARING").sort(byQueue),
    ready: orders
      .filter((o) => o.status === "READY")
      .sort((a, b) => ts(b.ready_at) - ts(a.ready_at) || b.number - a.number)
      .slice(0, readyLimit),
  };
}

/**
 * Kitchen clock start: when the order was accepted (falls back to arrival). A scheduled order counts
 * from its scheduled time minus the average prep time (when cooking must start to be ready on time),
 * so it reads as a countdown (negative) until then and turns warning at the scheduled time.
 */
export function kitchenSince(
  o: Pick<KitchenOrder, "confirmed_at" | "created_at" | "scheduled_for">,
  avgPrepMinutes: number,
): number {
  const accepted = new Date(o.confirmed_at ?? o.created_at).getTime();
  if (!o.scheduled_for) return accepted;
  const start = new Date(o.scheduled_for).getTime() - Math.max(0, avgPrepMinutes) * 60_000;
  return Math.max(accepted, start);
}

export type TimerTone = "normal" | "warning" | "danger";

/** Warning once the order passes the restaurant's average prep time, danger after 1.5×. */
export function timerTone(elapsedMs: number, avgPrepMinutes: number): TimerTone {
  const avg = Math.max(1, avgPrepMinutes) * 60_000;
  if (elapsedMs >= avg * 1.5) return "danger";
  if (elapsedMs >= avg) return "warning";
  return "normal";
}

/** "04:07", "1:02:30" — the kitchen reads a running clock, not "12 min". */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "Entrega", "Retirada", "Mesa 12". */
export function kitchenTypeLabel(o: Pick<KitchenOrder, "type" | "table_number">): string {
  if (o.type === "DELIVERY") return "Entrega";
  if (o.type === "PICKUP") return "Retirada";
  return o.table_number != null ? `Mesa ${o.table_number}` : "Mesa";
}

/** "Bacon extra", "Bacon extra ×2". */
export function addonLabel(a: KitchenAddon): string {
  return a.quantity > 1 ? `${a.option_name} ×${a.quantity}` : a.option_name;
}
