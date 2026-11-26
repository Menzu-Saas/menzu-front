// Pure helpers for the orders board (/painel/pedidos): card shape, filters, labels, time formatting
// and the board's quick actions. Shared by the server query, the realtime hook and the UI.
import { allowedTransitions, type MemberRole, type OrderStatus, type OrderType } from "./order-status";
import type { Order, PaymentMethod } from "./types";

/** Columns the board card needs (+ item names for the summary line). */
export const BOARD_ORDER_SELECT =
  "id, number, status, type, customer_name, customer_phone, payment_method, total_cents, created_at, scheduled_for, table_number, confirmed_at, preparing_at, ready_at, out_for_delivery_at, delivered_at, cancelled_at, items:order_items(product_name, variant_name, quantity)" as const;

export interface BoardOrderItem {
  product_name: string;
  variant_name: string | null;
  quantity: number;
}

export type BoardOrder = Pick<
  Order,
  | "id"
  | "number"
  | "status"
  | "type"
  | "customer_name"
  | "customer_phone"
  | "payment_method"
  | "total_cents"
  | "created_at"
  | "scheduled_for"
  | "table_number"
  | "confirmed_at"
  | "preparing_at"
  | "ready_at"
  | "out_for_delivery_at"
  | "delivered_at"
  | "cancelled_at"
> & { items: BoardOrderItem[] };

/** Fields of a realtime `orders` row that the board merges into an existing card. */
const MERGE_KEYS = [
  "status",
  "type",
  "customer_name",
  "customer_phone",
  "payment_method",
  "total_cents",
  "scheduled_for",
  "table_number",
  "confirmed_at",
  "preparing_at",
  "ready_at",
  "out_for_delivery_at",
  "delivered_at",
  "cancelled_at",
] as const satisfies readonly (keyof BoardOrder)[];

export function mergeOrderRow(card: BoardOrder, row: Partial<Order>): BoardOrder {
  const next = { ...card };
  for (const key of MERGE_KEYS) {
    if (key in row && row[key] !== undefined) (next as Record<string, unknown>)[key] = row[key];
  }
  return next;
}

/** Board ordering: newest first. */
export function sortBoardOrders(orders: BoardOrder[]): BoardOrder[] {
  return [...orders].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

// ---------------------------------------------------------------------------------------------
// Filters (reference P2 chips)

export const BOARD_FILTERS = [
  { id: "all", label: "Todos", statuses: null, showCount: true },
  { id: "new", label: "Novos", statuses: ["PENDING"], showCount: true },
  { id: "preparing", label: "Em preparo", statuses: ["CONFIRMED", "PREPARING", "READY"], showCount: true },
  { id: "delivering", label: "Em entrega", statuses: ["OUT_FOR_DELIVERY"], showCount: true },
  // P2 shows "Concluídos" without a count.
  { id: "done", label: "Concluídos", statuses: ["DELIVERED", "CANCELLED"], showCount: false },
] as const satisfies readonly {
  id: string;
  label: string;
  statuses: readonly OrderStatus[] | null;
  showCount: boolean;
}[];

export type BoardFilterId = (typeof BOARD_FILTERS)[number]["id"];

export function matchesFilter(status: OrderStatus, filter: BoardFilterId): boolean {
  const f = BOARD_FILTERS.find((x) => x.id === filter);
  if (!f || f.statuses === null) return true;
  return (f.statuses as readonly OrderStatus[]).includes(status);
}

export function filterCounts(orders: Pick<BoardOrder, "status">[]): Record<BoardFilterId, number> {
  const counts = { all: 0, new: 0, preparing: 0, delivering: 0, done: 0 } as Record<BoardFilterId, number>;
  for (const o of orders) {
    for (const f of BOARD_FILTERS) if (matchesFilter(o.status, f.id)) counts[f.id]++;
  }
  return counts;
}

// ---------------------------------------------------------------------------------------------
// Kanban columns

export interface BoardColumn {
  status: OrderStatus;
  title: string;
  /** Collapsed by default (narrow strip that still accepts drops). */
  collapsible: boolean;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { status: "PENDING", title: "Novos", collapsible: false },
  { status: "CONFIRMED", title: "Confirmados", collapsible: false },
  { status: "PREPARING", title: "Em preparo", collapsible: false },
  { status: "READY", title: "Prontos", collapsible: false },
  { status: "OUT_FOR_DELIVERY", title: "Em entrega", collapsible: false },
  { status: "DELIVERED", title: "Concluídos hoje", collapsible: true },
  { status: "CANCELLED", title: "Cancelados", collapsible: true },
];

/** Columns a card may be dropped on: the transitions this role may perform for this order. */
export function dropTargets(order: Pick<BoardOrder, "status" | "type">, role: MemberRole): OrderStatus[] {
  return allowedTransitions(order.status, role, order.type);
}

// ---------------------------------------------------------------------------------------------
// Labels

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CARD_ONLINE: "Cartão online",
  CARD_ON_DELIVERY: "Cartão na entrega",
  CASH: "Dinheiro",
};

/** Short payment label for the card meta line (P2: "Entrega · Pix", "Retirada · Cartão"). */
export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CARD_ONLINE: "Cartão",
  CARD_ON_DELIVERY: "Cartão",
  CASH: "Dinheiro",
};

export function boardTypeLabel(order: Pick<BoardOrder, "type" | "table_number">): string {
  if (order.type === "DELIVERY") return "Entrega";
  if (order.type === "PICKUP") return "Retirada";
  return order.table_number != null ? `Mesa ${order.table_number}` : "Mesa";
}

/** "Classic Burger, Refrigerante ×2". */
export function itemsSummary(items: BoardOrderItem[]): string {
  return items
    .map((i) => {
      const name = i.variant_name ? `${i.product_name} (${i.variant_name})` : i.product_name;
      return i.quantity > 1 ? `${name} ×${i.quantity}` : name;
    })
    .join(", ");
}

// ---------------------------------------------------------------------------------------------
// Time

type StatusTimes = Pick<
  BoardOrder,
  | "status"
  | "created_at"
  | "confirmed_at"
  | "preparing_at"
  | "ready_at"
  | "out_for_delivery_at"
  | "delivered_at"
  | "cancelled_at"
>;

/** When the order entered its current status (falls back to creation). */
export function statusSince(order: StatusTimes): string {
  const at: Record<OrderStatus, string | null> = {
    PENDING: order.created_at,
    CONFIRMED: order.confirmed_at,
    PREPARING: order.preparing_at,
    READY: order.ready_at,
    OUT_FOR_DELIVERY: order.out_for_delivery_at,
    DELIVERED: order.delivered_at,
    CANCELLED: order.cancelled_at,
  };
  return at[order.status] ?? order.created_at;
}

/** "agora", "12 min", "2 h 05", "3 d". */
export function formatElapsed(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
  return `${Math.floor(hours / 24)} d`;
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** "04/10 · 19:42". */
export function formatDateTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone, day: "2-digit", month: "2-digit" }).format(d);
  return `${date} · ${formatTime(iso, timeZone)}`;
}

const dayKey = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Scheduled time for tags and kitchen tickets: "20:30" when it is today, "07/10 · 20:30" otherwise. */
export function formatBoardSchedule(iso: string, timeZone: string, now: number): string {
  return dayKey(new Date(iso), timeZone) === dayKey(new Date(now), timeZone) ? formatTime(iso, timeZone) : formatDateTime(iso, timeZone);
}

/** "4 de outubro". */
export function formatDayLong(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, day: "numeric", month: "long" }).format(date);
}

/**
 * Status badge suffix, as in P2: new orders show the time they arrived ("NOVO · 19:42"), finished
 * orders the time they finished ("CONCLUÍDO · 19:10"), everything in between the time spent in the
 * current status ("EM PREPARO · 12 min").
 */
export function badgeSuffix(order: StatusTimes, now: number, timeZone: string): string {
  if (order.status === "PENDING") return formatTime(order.created_at, timeZone);
  if (order.status === "DELIVERED" || order.status === "CANCELLED") return formatTime(statusSince(order), timeZone);
  return formatElapsed(now - new Date(statusSince(order)).getTime());
}

/** UTC instant of 00:00 today in `timeZone`. */
export function startOfDayInTimeZone(now: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  // Offset of the zone at `now`: (wall clock read as UTC) - real instant.
  const wallAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offset);
}

// ---------------------------------------------------------------------------------------------
// Quick actions (P2 row buttons)

export interface BoardAction {
  /** Status changes applied in order (e.g. "Aceitar e preparar" = CONFIRMED then PREPARING). */
  steps: OrderStatus[];
  label: string;
  variant: "success" | "inverse";
}

function readyLabel(type: OrderType): string {
  if (type === "PICKUP") return "Pronto para retirada";
  if (type === "DELIVERY") return "Pronto para entrega";
  return "Pronto para servir";
}

/**
 * The forward action of a board row/card, or null when the role has none. Built on the same
 * transition table as `nextPrimaryAction`, with P2 copy: "Aceitar e preparar" (success, confirms and
 * starts preparing; just "Aceitar pedido" for an order scheduled later than now + avg prep),
 * "Pronto para retirada" (inverse), "Concluir" (success).
 */
export interface BoardClock {
  now: number;
  /** Restaurant average prep time (minutes). */
  avgPrepMinutes: number;
}

/** Scheduled so far ahead that the kitchen should not start yet (scheduled_for > now + avg prep). */
export function isScheduledAhead(order: Pick<BoardOrder, "scheduled_for">, clock: BoardClock): boolean {
  if (!order.scheduled_for) return false;
  return new Date(order.scheduled_for).getTime() > clock.now + Math.max(0, clock.avgPrepMinutes) * 60_000;
}

export function boardPrimaryAction(
  order: Pick<BoardOrder, "status" | "type" | "scheduled_for">,
  role: MemberRole,
  clock: BoardClock,
): BoardAction | null {
  const next = allowedTransitions(order.status, role, order.type).filter((s) => s !== "CANCELLED");
  const to = next[0];
  if (!to) return null;
  switch (to) {
    case "CONFIRMED": {
      // A scheduled order that is not due yet is only accepted; the kitchen starts it closer to the time.
      const canPrepare =
        allowedTransitions("CONFIRMED", role, order.type).includes("PREPARING") && !isScheduledAhead(order, clock);
      return canPrepare
        ? { steps: ["CONFIRMED", "PREPARING"], label: "Aceitar e preparar", variant: "success" }
        : { steps: ["CONFIRMED"], label: "Aceitar pedido", variant: "success" };
    }
    case "PREPARING":
      return { steps: ["PREPARING"], label: "Iniciar preparo", variant: "inverse" };
    case "READY":
      return { steps: ["READY"], label: readyLabel(order.type), variant: "inverse" };
    case "OUT_FOR_DELIVERY":
      return { steps: ["OUT_FOR_DELIVERY"], label: "Saiu para entrega", variant: "inverse" };
    case "DELIVERED":
      return { steps: ["DELIVERED"], label: "Concluir", variant: "success" };
    default:
      return null;
  }
}

export function canCancel(order: Pick<BoardOrder, "status" | "type">, role: MemberRole): boolean {
  return allowedTransitions(order.status, role, order.type).includes("CANCELLED");
}

/** Label of a status-history step (tracking timeline copy). */
export const HISTORY_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pedido recebido",
  CONFIRMED: "Pedido aceito",
  PREPARING: "Em preparo na cozinha",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Pedido concluído",
  CANCELLED: "Pedido cancelado",
};

/** The happy path of an order type, used to draw the remaining (empty) timeline steps. */
export function statusPath(type: OrderType): OrderStatus[] {
  return type === "DELIVERY"
    ? ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]
    : ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];
}
